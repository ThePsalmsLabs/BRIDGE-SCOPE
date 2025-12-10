import { z } from 'zod';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const transferRouter = createTRPCRouter({
  /**
   * Get recent transfers
   */
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
      const direction = input?.direction;

      // Check cache
      const cacheKey = CacheKeys.transferRecent(limit, direction);
      const cached = await cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Query transfers from database
      const transfers = await db.transfer.findMany({
        where: direction ? { direction } : undefined,
        orderBy: { blockTimestamp: 'desc' },
        take: limit,
        include: {
          localTokenMeta: {
            select: {
              symbol: true,
              decimals: true,
            },
          },
          dapp: input?.includeAttribution
            ? {
                select: {
                  id: true,
                  name: true,
                },
              }
            : false,
        },
      });

      // Map to response format
      const result = transfers.map((tx) => ({
        id: tx.id,
        chain: tx.chain,
        from: tx.direction === 'BASE_TO_SOLANA' ? 'Base' : 'Solana',
        to: tx.direction === 'BASE_TO_SOLANA' ? 'Solana' : 'Base',
        amount: Number(tx.amountNormalized),
        amountUsd: tx.amountUsd ? Number(tx.amountUsd) : null,
        token: {
          symbol: tx.localTokenMeta.symbol,
          address: tx.localToken,
        },
        status: tx.status.toLowerCase() as 'pending' | 'completed' | 'failed',
        dappId: tx.dappId,
        dappName: input?.includeAttribution && tx.dapp ? tx.dapp.name : undefined,
        attributionConfidence: tx.attributionConfidence,
        initiatedAt: tx.blockTimestamp.getTime(),
        completedAt: tx.status === 'COMPLETED' ? tx.blockTimestamp.getTime() : null,
        attributionSignals: input?.includeAttribution
          ? [
              {
                type: tx.attributionMethod || 'UNKNOWN',
                value: tx.dappId || 'none',
                confidence: tx.attributionConfidence || 0,
              },
            ]
          : undefined,
        txHash: tx.transactionHash,
        source: 'database' as const,
      }));

      // Cache for 10 seconds
      await cache.set(cacheKey, JSON.stringify(result), "EX", CacheTTL.RECENT_TRANSFERS);

      return result;
    }),

  /**
   * Get live transfer counts
   */
  liveCount: publicProcedure.query(async () => {
    // Check cache
    const cacheKey = 'transfers:live:count';
    const cached = await cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get counts from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [pending, completed] = await Promise.all([
      db.transfer.count({
        where: {
          status: 'PENDING',
          blockTimestamp: { gte: oneHourAgo },
        },
      }),
      db.transfer.count({
        where: {
          status: 'COMPLETED',
          blockTimestamp: { gte: oneHourAgo },
        },
      }),
    ]);

    const result = {
      pending,
      completed,
      lastUpdated: Date.now(),
      source: 'database' as const,
    };

    // Cache for 10 seconds
    await cache.set(cacheKey, JSON.stringify(result), "EX", 10);

    return result;
  }),

  /**
   * Get transfer by ID
   */
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const transfer = await db.transfer.findUnique({
        where: { id: input.id },
        include: {
          localTokenMeta: true,
          dapp: true,
        },
      });

      if (!transfer) return null;

      return {
        id: transfer.id,
        transactionHash: transfer.transactionHash,
        blockNumber: transfer.blockNumber.toString(),
        blockTimestamp: transfer.blockTimestamp.getTime(),
        chain: transfer.chain,
        direction: transfer.direction,
        status: transfer.status.toLowerCase() as 'pending' | 'completed' | 'failed',
        from: transfer.from,
        to: transfer.to,
        token: {
          address: transfer.localToken,
          symbol: transfer.localTokenMeta.symbol,
          name: transfer.localTokenMeta.name,
          decimals: transfer.localTokenMeta.decimals,
        },
        amount: Number(transfer.amountNormalized),
        amountRaw: transfer.amount,
        amountUsd: transfer.amountUsd ? Number(transfer.amountUsd) : null,
        priceUsdAtTime: transfer.priceUsdAtTime ? Number(transfer.priceUsdAtTime) : null,
        dapp: transfer.dapp
          ? {
              id: transfer.dapp.id,
              name: transfer.dapp.name,
              category: transfer.dapp.category,
            }
          : null,
        attributionConfidence: transfer.attributionConfidence,
        attributionMethod: transfer.attributionMethod,
        messageHash: transfer.messageHash,
        relayer: transfer.relayer,
        feeAmount: transfer.feeAmount,
        feeAmountUsd: transfer.feeAmountUsd ? Number(transfer.feeAmountUsd) : null,
      };
    }),

  /**
   * Get transfers for a specific dApp
   */
  byDapp: publicProcedure
    .input(
      z.object({
        dappId: z.string(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const transfers = await db.transfer.findMany({
        where: { dappId: input.dappId },
        orderBy: { blockTimestamp: 'desc' },
        take: input.limit,
        include: {
          localTokenMeta: {
            select: {
              symbol: true,
              decimals: true,
            },
          },
        },
      });

      return transfers.map((tx) => ({
        id: tx.id,
        chain: tx.chain,
        direction: tx.direction,
        amount: Number(tx.amountNormalized),
        amountUsd: tx.amountUsd ? Number(tx.amountUsd) : null,
        token: {
          symbol: tx.localTokenMeta.symbol,
          address: tx.localToken,
        },
        status: tx.status.toLowerCase() as 'pending' | 'completed' | 'failed',
        timestamp: tx.blockTimestamp.getTime(),
        txHash: tx.transactionHash,
      }));
    }),

  /**
   * Get transfer statistics by token
   */
  byToken: publicProcedure
    .input(
      z.object({
        tokenAddress: z.string(),
        timeframe: z.enum(['24h', '7d', '30d', 'all']).default('7d'),
      })
    )
    .query(async ({ input }) => {
      const tokenAddress = input.tokenAddress.toLowerCase();

      const timeframes: Record<string, number | null> = {
        '24h': 24 * 60 * 60,
        '7d': 7 * 24 * 60 * 60,
        '30d': 30 * 24 * 60 * 60,
        all: null,
      };

      const fromTimestamp = timeframes[input.timeframe]
        ? new Date(Date.now() - timeframes[input.timeframe]! * 1000)
        : new Date(0);

      const stats = await db.transfer.aggregate({
        where: {
          localToken: tokenAddress,
          blockTimestamp: { gte: fromTimestamp },
          amountUsd: { not: null },
          status: 'COMPLETED',
        },
        _sum: {
          amountNormalized: true,
          amountUsd: true,
        },
        _count: { id: true },
        _avg: { amountNormalized: true },
      });

      const token = await db.token.findUnique({
        where: { id: tokenAddress },
      });

      return {
        token: token
          ? {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
            }
          : null,
        stats: {
          totalVolume: Number(stats._sum.amountNormalized) || 0,
          totalVolumeUsd: Number(stats._sum.amountUsd) || 0,
          transferCount: stats._count.id,
          averageAmount: Number(stats._avg.amountNormalized) || 0,
        },
        timeframe: input.timeframe,
      };
    }),
});
