import { z } from 'zod';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';
import { createTRPCRouter, publicProcedure } from '../trpc';

const TIMEFRAMES: Record<'24h' | '7d' | '30d' | 'all', number | null> = {
  '24h': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
  '30d': 30 * 24 * 60 * 60,
  all: null,
};

/**
 * Get aggregated stats for a time period
 */
async function getAggregatedStats(timeframe: '24h' | '7d' | '30d' | 'all') {
  const seconds = TIMEFRAMES[timeframe];
  const nowSec = Math.floor(Date.now() / 1000);
  const fromTimestamp = seconds ? new Date((nowSec - seconds) * 1000) : new Date(0);

  // Aggregate from transfers table
  const [volumeAgg, uniqueUsers, activeDapps] = await Promise.all([
    // Total volume and count
    db.transfer.aggregate({
      where: {
        blockTimestamp: { gte: fromTimestamp },
        amountUsd: { not: null },
        status: 'COMPLETED',
      },
      _sum: { amountUsd: true },
      _count: { id: true },
    }),

    // Unique users (senders)
    db.transfer.findMany({
      where: {
        blockTimestamp: { gte: fromTimestamp },
        from: { not: null },
        status: 'COMPLETED',
      },
      select: { from: true },
      distinct: ['from'],
    }),

    // Active dApps
    db.transfer.findMany({
      where: {
        blockTimestamp: { gte: fromTimestamp },
        dappId: { not: null },
        status: 'COMPLETED',
      },
      select: { dappId: true },
      distinct: ['dappId'],
    }),
  ]);

  const totalVolume = Number(volumeAgg._sum.amountUsd) || 0;
  const transferCount = volumeAgg._count.id;
  const averageTransferSize = transferCount > 0 ? totalVolume / transferCount : 0;

  // Directional breakdown
  const baseToSolana = await db.transfer.aggregate({
    where: {
      blockTimestamp: { gte: fromTimestamp },
      direction: 'BASE_TO_SOLANA',
      amountUsd: { not: null },
      status: 'COMPLETED',
    },
    _sum: { amountUsd: true },
  });

  const solanaToBase = await db.transfer.aggregate({
    where: {
      blockTimestamp: { gte: fromTimestamp },
      direction: 'SOLANA_TO_BASE',
      amountUsd: { not: null },
      status: 'COMPLETED',
    },
    _sum: { amountUsd: true },
  });

  const baseToSolanaVolume = Number(baseToSolana._sum.amountUsd) || 0;
  const solanaToBaseVolume = Number(solanaToBase._sum.amountUsd) || 0;
  const baseToSolanaShare = totalVolume > 0 ? baseToSolanaVolume / totalVolume : 0;

  return {
    volume24h: totalVolume,
    transfers: transferCount,
    activeDapps: activeDapps.length,
    uniqueUsers: uniqueUsers.length,
    averageTransferSize,
    baseToSolanaShare,
    baseToSolanaVolume,
    solanaToBaseVolume,
  };
}

/**
 * Build time series data for volume chart
 */
async function buildVolumeSeries(timeframe: '7d' | '30d') {
  const days = timeframe === '30d' ? 30 : 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const points = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayStats = await db.transfer.aggregate({
      where: {
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

    points.push({
      timestamp: date.getTime(),
      volumeUsd: Number(dayStats._sum.amountUsd) || 0,
      transfers: dayStats._count.id,
    });
  }

  return points;
}

/**
 * Calculate indexing lag
 */
async function calculateIndexingLag(): Promise<number | null> {
  const latestTransfer = await db.transfer.findFirst({
    where: { chain: 'BASE' },
    orderBy: { blockNumber: 'desc' },
  });

  if (!latestTransfer) return null;

  // Estimate lag based on block timestamp
  const lagMs = Date.now() - latestTransfer.blockTimestamp.getTime();
  return Math.floor(lagMs / 1000); // Convert to seconds
}

export const statsRouter = createTRPCRouter({
  /**
   * Get global statistics
   */
  global: publicProcedure
    .input(z.object({ timeframe: z.enum(['24h', '7d', '30d', 'all']).default('24h') }).optional())
    .query(async ({ input }) => {
      const timeframe = input?.timeframe ?? '24h';

      // Check cache
      const cacheKey = CacheKeys.globalStats(timeframe);
      const cached = await cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Query database
      const stats = await getAggregatedStats(timeframe);

      const result = {
        volume24h: stats.volume24h,
        transfers: stats.transfers,
        activeDapps: stats.activeDapps,
        uniqueUsers: stats.uniqueUsers,
        averageTransferSize: stats.averageTransferSize,
        baseToSolanaShare: stats.baseToSolanaShare,
        baseToSolanaVolume: stats.baseToSolanaVolume,
        solanaToBaseVolume: stats.solanaToBaseVolume,
        lastUpdated: Date.now(),
        timeframe,
        source: 'database' as const,
      };

      // Cache result
      await cache.set(cacheKey, JSON.stringify(result), "EX", CacheTTL.GLOBAL_STATS);

      return result;
    }),

  /**
   * Get volume time series
   */
  volumeSeries: publicProcedure
    .input(z.object({ timeframe: z.enum(['7d', '30d']).default('7d') }).optional())
    .query(async ({ input }) => {
      const timeframe = input?.timeframe ?? '7d';

      // Check cache
      const cacheKey = `volume:series:${timeframe}`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Query database
      const points = await buildVolumeSeries(timeframe);

      const result = {
        timeframe,
        points,
        source: 'database' as const,
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, JSON.stringify(result), "EX", CacheTTL.DAPP_STATS);

      return result;
    }),

  /**
   * Get system health status
   */
  health: publicProcedure.query(async () => {
    // Check database connection
    let dbHealthy = true;
    try {
      await db.$queryRaw`SELECT 1`;
    } catch {
      dbHealthy = false;
    }

    // Calculate indexing lag
    const lagSeconds = await calculateIndexingLag();

    // Check if we have recent data
    const hasRecentData = lagSeconds !== null && lagSeconds < 300; // Less than 5 minutes

    return {
      database: {
        connected: dbHealthy,
        healthy: dbHealthy && hasRecentData,
      },
      subgraphs: {
        base: hasRecentData,
        solana: false, // TODO: implement Solana subgraph
      },
      lagSeconds,
      lastUpdated: Date.now(),
    };
  }),
});
