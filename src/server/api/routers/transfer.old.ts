import { z } from 'zod';

import { attributeTransfer } from '@/lib/attribution';
import { SUBGRAPH_URLS } from '@/lib/constants';
import { resolveTokenMetadata } from '@/lib/onchainMetadata';
import { fetchSubgraphSafe } from '@/lib/subgraph';
import { createTRPCRouter, publicProcedure } from '../trpc';

type RawTransfer = {
  id: string;
  localToken: string;
  remoteToken: string;
  to: string;
  amount: string;
  blockTimestamp: string;
  transactionHash: string;
};

async function fetchRecentFromSubgraph(limit: number) {
  const query = `
    query RecentTransfers($limit: Int!) {
      transferFinalizeds(first: $limit, orderBy: blockTimestamp, orderDirection: desc) {
        id
        localToken
        remoteToken
        to
        amount
        blockTimestamp
        transactionHash
      }
      transferInitializeds(first: $limit, orderBy: blockTimestamp, orderDirection: desc) {
        id
        localToken
        remoteToken
        to
        amount
        blockTimestamp
        transactionHash
      }
    }
  `;

  const base = await fetchSubgraphSafe<{ transferFinalizeds: RawTransfer[]; transferInitializeds: RawTransfer[] }>(
    SUBGRAPH_URLS.BASE,
    query,
    { limit },
    { transferFinalizeds: [], transferInitializeds: [] }
  );

  const tokenMeta = new Map<string, { symbol: string; decimals: number } | null>();
  const resolveToken = async (addr: string) => {
    const key = addr.toLowerCase();
    if (!tokenMeta.has(key)) {
      tokenMeta.set(key, await resolveTokenMetadata(addr));
    }
    return tokenMeta.get(key);
  };

  const normalize = async (t: RawTransfer, chain: 'BASE' | 'SOLANA', kind: 'FINALIZED' | 'INITIALIZED') => {
    const attributed = attributeTransfer({ targetContract: t.to });
    const ts = Number(t.blockTimestamp) * 1000;
    const direction =
      kind === 'INITIALIZED'
        ? chain === 'BASE'
          ? 'BASE_TO_SOLANA'
          : 'SOLANA_TO_BASE'
        : chain === 'BASE'
          ? 'SOLANA_TO_BASE'
          : 'BASE_TO_SOLANA';

    const meta = await resolveToken(t.localToken);
    const decimals = meta?.decimals ?? 18;
    const amountParsed = Number(t.amount) / 10 ** decimals;
    const tokenSymbol = meta?.symbol ?? 'TOKEN';

    return {
      id: t.id,
      chain,
      direction,
      to: t.to,
      amount: amountParsed,
      token: { symbol: tokenSymbol },
      status: kind === 'FINALIZED' ? 'completed' : 'pending',
      dappId: attributed.dappId ?? null,
      attributionConfidence: attributed.confidence,
      attributionSignals: attributed.signals,
      timestamp: ts,
      txHash: t.transactionHash,
    };
  };

  const combined = [
    ...(await Promise.all(base.transferFinalizeds.map((t) => normalize(t, 'BASE', 'FINALIZED')))),
    ...(await Promise.all(base.transferInitializeds.map((t) => normalize(t, 'BASE', 'INITIALIZED')))),
  ].sort((a, b) => b.timestamp - a.timestamp);

  return combined.slice(0, limit);
}

export const transferRouter = createTRPCRouter({
  recent: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          direction: z.enum(['BASE_TO_SOLANA', 'SOLANA_TO_BASE']).optional(),
          includeAttribution: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const list = await fetchRecentFromSubgraph(limit);
      const filtered = input?.direction ? list.filter((t) => t.direction === input.direction) : list;
      return filtered.map((tx) => ({
        id: tx.id,
        chain: tx.chain,
        from: tx.direction === 'BASE_TO_SOLANA' ? 'Base' : 'Solana',
        to: tx.direction === 'BASE_TO_SOLANA' ? 'Solana' : 'Base',
        amount: tx.amount,
        token: tx.token,
        status: tx.status,
        dappId: tx.dappId,
        attributionConfidence: tx.attributionConfidence,
        initiatedAt: tx.timestamp,
        completedAt: tx.status === 'completed' ? tx.timestamp : null,
        attributionSignals: input?.includeAttribution ? tx.attributionSignals : undefined,
        txHash: tx.txHash,
        source: 'subgraph',
      }));
    }),

  liveCount: publicProcedure.query(async () => {
    const list = await fetchRecentFromSubgraph(50);
    return {
      pending: list.filter((t) => t.status === 'pending').length,
      completed: list.filter((t) => t.status === 'completed').length,
      lastUpdated: Date.now(),
      source: 'subgraph',
    };
  }),
});