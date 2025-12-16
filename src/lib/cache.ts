import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Determine which cache strategy to use
type CacheStrategy = 'redis' | 'upstash' | 'mock';
const cacheStrategy: CacheStrategy = REDIS_URL
  ? 'redis'
  : UPSTASH_REST_URL && UPSTASH_REST_TOKEN
  ? 'upstash'
  : 'mock';

if (cacheStrategy === 'mock') {
  console.warn('⚠️  No Redis configured - using in-memory cache');
}

// Upstash REST API client
function createUpstashClient() {
  console.log('✅ Using Upstash REST API');

  return {
    async get(key: string) {
      try {
        const response = await fetch(`${UPSTASH_REST_URL}/get/${key}`, {
          headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
        });
        const data = await response.json();
        return data.result;
      } catch (error) {
        console.error('Upstash GET error:', error);
        return null;
      }
    },
    async set(key: string, value: string, _mode?: string, duration?: number) {
      try {
        const url = duration
          ? `${UPSTASH_REST_URL}/set/${key}/${encodeURIComponent(value)}/EX/${duration}`
          : `${UPSTASH_REST_URL}/set/${key}/${encodeURIComponent(value)}`;
        await fetch(url, {
          headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
        });
      } catch (error) {
        console.error('Upstash SET error:', error);
      }
    },
    async del(key: string) {
      try {
        await fetch(`${UPSTASH_REST_URL}/del/${key}`, {
          headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
        });
      } catch (error) {
        console.error('Upstash DEL error:', error);
      }
    },
  } as any;
}

// Mock Redis for development
function createMockRedis() {
  console.log('⚠️  Using in-memory mock cache (development only)');
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async set(key: string, value: string) {
      store.set(key, value);
      return 'OK';
    },
    async del(key: string) {
      store.delete(key);
      return 1;
    },
  } as any;
}

// Create traditional Redis client
function createRedisClient() {
  console.log('🔄 Connecting to Redis...');

  const client = new Redis(REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
    enableReadyCheck: true,
    enableOfflineQueue: false,
  });

  // Connect and set up event handlers
  client
    .connect()
    .then(() => console.log('✅ Connected to Redis'))
    .catch((err: Error) => {
      console.error('❌ Failed to connect to Redis:', err);
    });

  client.on('error', (err: Error) => console.error('Redis error:', err));
  client.on('reconnecting', () => console.log('🔄 Reconnecting to Redis...'));
  client.on('ready', () => console.log('✅ Redis ready'));

  return client;
}

// Export the cache client based on strategy
export const cache =
  cacheStrategy === 'redis'
    ? createRedisClient()
    : cacheStrategy === 'upstash'
    ? createUpstashClient()
    : createMockRedis();

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
