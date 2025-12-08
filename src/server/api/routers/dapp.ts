import { z } from 'zod';

import { DAPP_REGISTRY, SUBGRAPH_URLS } from '@/lib/constants';
import { fetchSubgraph } from '@/lib/subgraph';
import { fetchDappLeaderboard } from '@/lib/solana-store';
import { getDappById, getDapps } from '@/lib/registry';
import type { Dapp } from '@/types/dapp';
import { createTRPCRouter, publicProcedure } from '../trpc';

type TimeseriesPoint = { timestamp: number; value: number };

const mockVolumes: Record<string, number> = {
  zora: 12_400_000,
  aerodrome: 9_100_000,
  virtuals: 4_500_000,
  flaunch: 2_200_000,
  relay: 1_900_000,
};

const mockTransfers: Record<string, number> = {
  zora: 8214,
  aerodrome: 6002,
  virtuals: 2400,
  flaunch: 1500,
  relay: 1100,
};

function attachMetrics(dapps: Dapp[]): Dapp[] {
  return dapps.map((dapp) => ({
    ...dapp,
    volumeUsd: mockVolumes[dapp.id] ?? 0,
    transfers: mockTransfers[dapp.id] ?? 0,
  }));
}

function generateSeries(days = 7, base = 1_000_000): TimeseriesPoint[] {
  const now = Date.now();
  return Array.from({ length: days }).map((_, idx) => ({
    timestamp: now - idx * 24 * 60 * 60 * 1000,
    value: Math.round(base * (1 + Math.sin(idx / 2) * 0.15)),
  }));
}

export const dappRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ input }) => {
      const solanaLeaderboard = await fetchDappLeaderboard(input?.limit ?? 10);
      const dappsWithLive = attachMetrics(getDapps()).map((dapp) => {
        const live = solanaLeaderboard.find((row) => row.attribution_dapp === dapp.id);
        return live
          ? { ...dapp, transfers: Number(live.transfers) }
          : dapp;
      });

      const dapps = dappsWithLive.sort((a, b) => (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0));

      const limited = input?.limit ? dapps.slice(0, input.limit) : dapps;

      if (SUBGRAPH_URLS.BASE) {
        // placeholder: would enrich with live subgraph data
        void SUBGRAPH_URLS.BASE;
      }

      return limited;
    }),

  byId: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
    const dapp = getDappById(input.id);
    if (!dapp) {
      return null;
    }
    const withMetrics = attachMetrics([dapp])[0];
    return withMetrics;
  }),

  activity: publicProcedure
    .input(
      z.object({
        id: z.string(),
        timeframe: z.enum(['24h', '7d', '30d', 'all']).default('7d'),
      })
    )
    .query(async ({ input }) => {
      const dapp = getDappById(input.id);
      if (!dapp) {
        return null;
      }

      // Placeholder: sample data; swap to subgraph query once endpoints are configured.
      const baseVolume = mockVolumes[dapp.id] ?? 0;
      const days = input.timeframe === '24h' ? 1 : input.timeframe === '7d' ? 7 : 30;
      const series = generateSeries(days, baseVolume / Math.max(days, 1));

      return {
        dapp: attachMetrics([dapp])[0],
        timeframe: input.timeframe,
        totals: {
          volumeUsd: baseVolume,
          transfers: mockTransfers[dapp.id] ?? 0,
          uniqueUsers: Math.round((mockTransfers[dapp.id] ?? 0) * 0.35),
        },
        directionBreakdown: {
          baseToSolana: Math.round((mockTransfers[dapp.id] ?? 0) * 0.55),
          solanaToBase: Math.round((mockTransfers[dapp.id] ?? 0) * 0.45),
        },
        timeseries: series.reverse(),
      };
    }),
});