import { z } from 'zod';

import { SUBGRAPH_URLS } from '@/lib/constants';
import { resolveTokenMetadata } from '@/lib/onchainMetadata';
import { fetchSubgraphSafe } from '@/lib/subgraph';
import { createTRPCRouter, publicProcedure } from '../trpc';

type RawTransfer = {
  amount: string;
  blockTimestamp: string;
  to: string;
  localToken: string;
};

const TIMEFRAMES: Record<'24h' | '7d' | '30d' | 'all', number | null> = {
  '24h': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
  '30d': 30 * 24 * 60 * 60,
  all: null,
};

async function fetchTransfers(timeframe: '24h' | '7d' | '30d' | 'all') {
  const seconds = TIMEFRAMES[timeframe];
  const nowSec = Math.floor(Date.now() / 1000);
  const where = seconds ? `, where: { blockTimestamp_gte: ${nowSec - seconds} }` : '';
  const query = `
    {
      transferFinalizeds(first: 1000, orderBy: blockTimestamp, orderDirection: desc${where}) {
        amount
        blockTimestamp
        to
        localToken
      }
    }
  `;

  const baseData = await fetchSubgraphSafe<{ transferFinalizeds: RawTransfer[] }>(
    SUBGRAPH_URLS.BASE,
    query,
    undefined,
    { transferFinalizeds: [] }
  );
  return [...baseData.transferFinalizeds];
}

async function aggregate(transfers: RawTransfer[]) {
  // Create a map to cache token decimals
  const tokenDecimalsCache = new Map<string, number>();

  // Resolve all unique token decimals in parallel
  const uniqueTokens = Array.from(new Set(transfers.map(t => t.localToken.toLowerCase())));
  await Promise.all(
    uniqueTokens.map(async (tokenAddress) => {
      const meta = await resolveTokenMetadata(tokenAddress);
      tokenDecimalsCache.set(tokenAddress, meta?.decimals ?? 18);
    })
  );

  // Calculate volume with proper decimal normalization
  let volume = 0;
  for (const t of transfers) {
    const decimals = tokenDecimalsCache.get(t.localToken.toLowerCase()) ?? 18;
    const normalizedAmount = Number(t.amount) / Math.pow(10, decimals);
    volume += normalizedAmount;
  }

  const counts = transfers.length;
  const activeDapps = new Set(transfers.map((t) => t.to.toLowerCase())).size;
  const averageTransfer = counts > 0 ? volume / counts : null;

  return { volume, counts, activeDapps, averageTransfer };
}

async function buildSeries(transfers: RawTransfer[], days: number) {
  // Create a map to cache token decimals
  const tokenDecimalsCache = new Map<string, number>();

  // Resolve all unique token decimals
  const uniqueTokens = Array.from(new Set(transfers.map(t => t.localToken.toLowerCase())));
  await Promise.all(
    uniqueTokens.map(async (tokenAddress) => {
      const meta = await resolveTokenMetadata(tokenAddress);
      tokenDecimalsCache.set(tokenAddress, meta?.decimals ?? 18);
    })
  );

  const byDay = new Map<number, { volume: number; count: number }>();

  transfers.forEach((t) => {
    const day = Math.floor(Number(t.blockTimestamp) / 86400);
    const entry = byDay.get(day) ?? { volume: 0, count: 0 };

    const decimals = tokenDecimalsCache.get(t.localToken.toLowerCase()) ?? 18;
    const normalizedAmount = Number(t.amount) / Math.pow(10, decimals);

    entry.volume += normalizedAmount;
    entry.count += 1;
    byDay.set(day, entry);
  });

  const today = Math.floor(Date.now() / 1000 / 86400);
  return Array.from({ length: days }).map((_, idx) => {
    const day = today - (days - 1 - idx);
    const entry = byDay.get(day) ?? { volume: 0, count: 0 };
    return {
      timestamp: day * 86400 * 1000,
      volumeUsd: entry.volume,
      transfers: entry.count,
    };
  });
}

export const statsRouter = createTRPCRouter({
  global: publicProcedure
    .input(z.object({ timeframe: z.enum(['24h', '7d', '30d', 'all']).default('24h') }).optional())
    .query(async ({ input }) => {
      const timeframe = input?.timeframe ?? '24h';
      const transfers = await fetchTransfers(timeframe);
      const agg = await aggregate(transfers);
      return {
        volume24h: agg.volume,
        transfers: agg.counts,
        activeDapps: agg.activeDapps,
        averageFee: agg.averageTransfer, // kept for backward compatibility
        averageTransferSize: agg.averageTransfer,
        baseToSolanaShare: null,
        lastUpdated: Date.now(),
        timeframe,
        source: 'subgraph',
      };
    }),

  volumeSeries: publicProcedure
    .input(z.object({ timeframe: z.enum(['7d', '30d']).default('7d') }).optional())
    .query(async ({ input }) => {
      const timeframe = input?.timeframe ?? '7d';
      const days = timeframe === '30d' ? 30 : 7;
      const transfers = await fetchTransfers(timeframe);
      const points = await buildSeries(transfers, days);
      return {
        timeframe,
        points,
        source: 'subgraph',
      };
    }),

  health: publicProcedure.query(() => ({
    subgraphs: {
      base: !!SUBGRAPH_URLS.BASE,
      solana: !!SUBGRAPH_URLS.SOLANA,
    },
    lagSeconds: null,
    lastUpdated: Date.now(),
  })),
});