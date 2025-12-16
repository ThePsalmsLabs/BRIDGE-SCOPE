import { z } from 'zod';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { resolveContractName } from '@/lib/onchainMetadata';

const TIMEFRAMES: Record<'24h' | '7d' | '30d' | 'all', number | null> = {
  '24h': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
  '30d': 30 * 24 * 60 * 60,
  all: null,
};

/**
 * Get dApp metrics for a timeframe
 */
async function getDappMetrics(dappId: string, timeframe: '24h' | '7d' | '30d' | 'all') {
  const seconds = TIMEFRAMES[timeframe];
  const fromTimestamp = seconds ? new Date(Date.now() - seconds * 1000) : new Date(0);

  const metrics = await db.transfer.aggregate({
    where: {
      dappId,
      blockTimestamp: { gte: fromTimestamp },
      amountUsd: { not: null },
      status: 'COMPLETED',
    },
    _sum: { amountUsd: true },
    _count: { id: true },
  });

  return {
    volumeUsd: Number(metrics._sum.amountUsd) || 0,
    transfers: metrics._count.id,
  };
}

/**
 * Build time series for a dApp
 */
async function buildDappSeries(dappId: string, timeframe: '24h' | '7d' | '30d' | 'all') {
  const days = timeframe === '30d' ? 30 : timeframe === '7d' ? 7 : 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const series = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayMetrics = await db.transfer.aggregate({
      where: {
        dappId,
        blockTimestamp: {
          gte: date,
          lt: nextDate,
        },
        amountUsd: { not: null },
        status: 'COMPLETED',
      },
      _sum: { amountUsd: true },
      _count: { id: true },
    });

    series.push({
      timestamp: date.getTime(),
      value: Number(dayMetrics._sum.amountUsd) || 0,
      transfers: dayMetrics._count.id,
    });
  }

  return series;
}

export const dappRouter = createTRPCRouter({
  /**
   * List all dApps with their metrics
   */
  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 10;

      // Get all dApps from database
      const dapps = await db.dapp.findMany({
        include: {
          contracts: {
            where: { chain: 'BASE', isActive: true },
          },
        },
      });

      // Get metrics for last 7 days
      const fromTimestamp = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const dappsWithMetrics = await Promise.all(
        dapps.map(async (dapp) => {
          const metrics = await db.transfer.aggregate({
            where: {
              dappId: dapp.id,
              blockTimestamp: { gte: fromTimestamp },
              amountUsd: { not: null },
              status: 'COMPLETED',
            },
            _sum: { amountUsd: true },
            _count: { id: true },
          });

          return {
            ...dapp,
            volumeUsd: Number(metrics._sum.amountUsd) || 0,
            transfers: metrics._count.id,
            contracts: dapp.contracts.map((c) => ({
              chain: c.chain,
              address: c.address,
              role: c.role,
            })),
          };
        })
      );

      // Get unknown contracts (high volume but not attributed)
      const unknownTransfers = await db.transfer.groupBy({
        by: ['to'],
        where: {
          dappId: null,
          blockTimestamp: { gte: fromTimestamp },
          amountUsd: { not: null },
          status: 'COMPLETED',
        },
        _sum: { amountUsd: true },
        _count: { id: true },
        orderBy: {
          _sum: {
            amountUsd: 'desc',
          },
        },
        take: 10, // Top 10 unknown contracts
      });

      // Resolve names for unknown contracts
      const unknownDapps = await Promise.all(
        unknownTransfers.map(async (transfer) => {
          const address = transfer.to;
          const name = await resolveContractName(address);

          return {
            id: `unknown-${address}`,
            name: name || `Unknown ${address.slice(0, 6)}...${address.slice(-4)}`,
            category: 'OTHER' as const,
            volumeUsd: Number(transfer._sum.amountUsd) || 0,
            transfers: transfer._count.id,
            contracts: [
              {
                chain: 'BASE' as const,
                address,
                role: null,
              },
            ],
            isVerified: false,
          };
        })
      );

      // Combine and sort by volume
      const combined = [...dappsWithMetrics, ...unknownDapps].sort(
        (a, b) => b.volumeUsd - a.volumeUsd
      );

      return combined.slice(0, limit);
    }),

  /**
   * Get single dApp details
   */
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const dapp = await db.dapp.findUnique({
        where: { id: input.id },
        include: {
          contracts: {
            where: { isActive: true },
          },
        },
      });

    if (!dapp) return null;

      // Get 30-day metrics
      const metrics = await getDappMetrics(input.id, '30d');

      return {
        ...dapp,
        volumeUsd: metrics.volumeUsd,
        transfers: metrics.transfers,
        contracts: dapp.contracts.map((c) => ({
          chain: c.chain,
          address: c.address,
          role: c.role,
        })),
      };
    }),

  /**
   * Get dApp activity over time
   */
  activity: publicProcedure
    .input(
      z.object({
        id: z.string(),
        timeframe: z.enum(['24h', '7d', '30d', 'all']).default('7d'),
      })
    )
    .query(async ({ input }) => {
      // Check cache
      const cacheKey = CacheKeys.dappStats(input.id, input.timeframe);
      const cached = await cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const dapp = await db.dapp.findUnique({
        where: { id: input.id },
      });

      if (!dapp) return null;

      // Get metrics
      const metrics = await getDappMetrics(input.id, input.timeframe);

      // Get unique users
      const uniqueUsers = await db.transfer.findMany({
        where: {
          dappId: input.id,
          blockTimestamp: {
            gte: TIMEFRAMES[input.timeframe]
              ? new Date(Date.now() - TIMEFRAMES[input.timeframe]! * 1000)
              : new Date(0),
          },
          from: { not: null },
          status: 'COMPLETED',
        },
        select: { from: true },
        distinct: ['from'],
      });

      // Directional breakdown
      const [baseToSolana, solanaToBase] = await Promise.all([
        db.transfer.aggregate({
          where: {
            dappId: input.id,
            direction: 'BASE_TO_SOLANA',
            blockTimestamp: {
              gte: TIMEFRAMES[input.timeframe]
                ? new Date(Date.now() - TIMEFRAMES[input.timeframe]! * 1000)
                : new Date(0),
            },
            amountUsd: { not: null },
            status: 'COMPLETED',
          },
          _sum: { amountUsd: true },
          _count: { id: true },
        }),
        db.transfer.aggregate({
          where: {
            dappId: input.id,
            direction: 'SOLANA_TO_BASE',
            blockTimestamp: {
              gte: TIMEFRAMES[input.timeframe]
                ? new Date(Date.now() - TIMEFRAMES[input.timeframe]! * 1000)
                : new Date(0),
            },
            amountUsd: { not: null },
            status: 'COMPLETED',
          },
          _sum: { amountUsd: true },
          _count: { id: true },
        }),
      ]);

      // Build time series
      const timeseries = await buildDappSeries(input.id, input.timeframe);

      const result = {
        dapp,
        timeframe: input.timeframe,
        totals: {
          volumeUsd: metrics.volumeUsd,
          transfers: metrics.transfers,
          uniqueUsers: uniqueUsers.length,
        },
        directionBreakdown: {
          baseToSolana: {
            volume: Number(baseToSolana._sum.amountUsd) || 0,
            count: baseToSolana._count.id,
          },
          solanaToBase: {
            volume: Number(solanaToBase._sum.amountUsd) || 0,
            count: solanaToBase._count.id,
          },
        },
        timeseries,
      };

      // Cache result
      await cache.set(cacheKey, JSON.stringify(result), "EX", CacheTTL.DAPP_STATS);

      return result;
    }),
});
