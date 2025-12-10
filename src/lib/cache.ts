import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required for production');
}

// Create Redis client (PRODUCTION ONLY - NO FALLBACKS)
export const cache = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) {
      // Stop retrying after 10 attempts
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  lazyConnect: true,
  enableReadyCheck: true,
  enableOfflineQueue: false,
});

// Connect to Redis
cache
  .connect()
  .then(() => {
    console.log('✅ Connected to Redis');
  })
  .catch((err) => {
    console.error('❌ Failed to connect to Redis:', err);
    throw new Error('Redis connection required for production');
  });

// Error handling
cache.on('error', (err) => {
  console.error('Redis error:', err);
});

cache.on('reconnecting', () => {
  console.log('🔄 Reconnecting to Redis...');
});

cache.on('ready', () => {
  console.log('✅ Redis ready');
});

// Cache key builders
export const CacheKeys = {
  tokenMetadata: (address: string) => `token:meta:${address.toLowerCase()}`,
  tokenPrice: (address: string, timestamp?: number) =>
    `token:price:${address.toLowerCase()}:${timestamp || 'latest'}`,
  dappStats: (dappId: string, timeframe: string) => `dapp:stats:${dappId}:${timeframe}`,
  globalStats: (timeframe: string) => `global:stats:${timeframe}`,
  transferRecent: (limit: number, direction?: string) =>
    `transfers:recent:${limit}:${direction || 'all'}`,
} as const;

// Cache TTLs (in seconds)
export const CacheTTL = {
  TOKEN_METADATA: 24 * 60 * 60, // 24 hours
  TOKEN_PRICE: 5 * 60, // 5 minutes
  TOKEN_PRICE_HISTORICAL: 60 * 60, // 1 hour for historical prices
  GLOBAL_STATS: 60, // 1 minute
  DAPP_STATS: 5 * 60, // 5 minutes
  RECENT_TRANSFERS: 10, // 10 seconds
} as const;
