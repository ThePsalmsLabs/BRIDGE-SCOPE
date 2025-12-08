import { z } from 'zod';

import { attributeTransfer } from '@/lib/attribution';
import { fetchRecentTransfers } from '@/lib/solana-store';
import { createTRPCRouter, publicProcedure } from '../trpc';

const mockTransfers = [
  {
    id: 'tx1',
    from: 'Base',
    to: 'Solana',
    amountUsd: 2400,
    token: { symbol: 'SOL' },
    status: 'completed',
    dappId: 'zora',
    attributed: attributeTransfer({ targetContract: '0x777777C338d93e2C7adf08D102d45CA7CC4Ed021' }),
    initiatedAt: Date.now() - 1000 * 60 * 2,
    completedAt: Date.now() - 1000 * 60,
  },
  {
    id: 'tx2',
    from: 'Solana',
    to: 'Base',
    amountUsd: 1100,
    token: { symbol: 'SOL' },
    status: 'pending',
    dappId: 'aerodrome',
    attributed: attributeTransfer({ relayer: 'B7g2YCbodhvwpgX3u3URLsud6R1XMSaMiQ5LtXw4GKBC' }),
    initiatedAt: Date.now() - 1000 * 60 * 4,
    completedAt: null,
  },
];

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

      // Prefer live Solana data if available
      const solana = await fetchRecentTransfers(limit);
      if (solana.length > 0) {
        return solana.map((tx) => ({
          id: tx.signature,
          chain: 'SOLANA',
          from: 'Solana',
          to: 'Base',
          amountUsd: tx.amount ? Number(tx.amount) / 1e9 : 0,
          token: { symbol: tx.mint ?? 'SOL' },
          status: 'completed',
          dappId: tx.attribution_dapp ?? undefined,
          attributionConfidence: tx.attribution_confidence ?? 0,
          initiatedAt: new Date(tx.block_time).getTime(),
          completedAt: new Date(tx.block_time).getTime(),
          attributionSignals: input?.includeAttribution ? [] : undefined,
        }));
      }

      // Fallback to mocks
      const list = mockTransfers
        .filter((tx) => {
          if (!input?.direction) return true;
          return input.direction === 'BASE_TO_SOLANA' ? tx.from === 'Base' : tx.to === 'Base';
        })
        .slice(0, limit);

      return list.map((tx) => ({
        id: tx.id,
        chain: tx.from === 'Base' ? 'BASE' : 'SOLANA',
        from: tx.from,
        to: tx.to,
        amountUsd: tx.amountUsd,
        token: tx.token,
        status: tx.status,
        dappId: tx.attributed.dappId ?? tx.dappId,
        attributionConfidence: tx.attributed.confidence,
        initiatedAt: tx.initiatedAt,
        completedAt: tx.completedAt,
        attributionSignals: input?.includeAttribution ? tx.attributed.signals : undefined,
      }));
    }),

  liveCount: publicProcedure.query(() => {
    return {
      pending: mockTransfers.filter((tx) => tx.status === 'pending').length,
      completed: mockTransfers.filter((tx) => tx.status === 'completed').length,
      lastUpdated: Date.now(),
    };
  }),
});