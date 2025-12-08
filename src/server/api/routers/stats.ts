import { z } from 'zod';

import { SUBGRAPH_URLS } from '@/lib/constants';
import { fetchGlobalStats } from '@/lib/solana-store';
import { createTRPCRouter, publicProcedure } from '../trpc';

const globalMock = {
  volume24h: 42_100_000,
  transfers: 18_320,
  activeDapps: 5,
  averageFee: 3.21,
  baseToSolanaShare: 0.55,
};

function buildSeries(days: number) {
  const now = Date.now();
  return Array.from({ length: days }).map((_, idx) => ({
    timestamp: now - idx * 24 * 60 * 60 * 1000,
    volumeUsd: Math.round(1_000_000 * (1 + Math.sin(idx / 3) * 0.25)),
    transfers: Math.round(1000 * (1 + Math.cos(idx / 4) * 0.2)),
  })).reverse();
}

export const statsRouter = createTRPCRouter({
  global: publicProcedure
    .input(z.object({ timeframe: z.enum(['24h', '7d', '30d', 'all']).default('24h') }).optional())
    .query(async ({ input }) => {
      const timeframe = input?.timeframe ?? '24h';

      const solana = await fetchGlobalStats();

      return {
        ...globalMock,
        transfers: solana.transfers ?? globalMock.transfers,
        lastUpdated: solana.latest ? new Date(solana.latest).getTime() : Date.now(),
        timeframe,
        source: SUBGRAPH_URLS.BASE ? 'subgraph' : 'mock',
      };
    }),

  volumeSeries: publicProcedure
    .input(z.object({ timeframe: z.enum(['7d', '30d']).default('7d') }).optional())
    .query(({ input }) => {
      const days = input?.timeframe === '30d' ? 30 : 7;
      return {
        timeframe: input?.timeframe ?? '7d',
        points: buildSeries(days),
        source: SUBGRAPH_URLS.BASE ? 'subgraph' : 'mock',
      };
    }),

  health: publicProcedure.query(() => ({
    subgraphs: {
      base: !!SUBGRAPH_URLS.BASE,
      solana: !!SUBGRAPH_URLS.SOLANA,
    },
    lagSeconds: SUBGRAPH_URLS.BASE ? 15 : null,
    lastUpdated: Date.now(),
  })),
});