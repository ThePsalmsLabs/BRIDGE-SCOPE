import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Use Upstash REST API if available (Vercel KV), otherwise traditional Redis
const useUpstash = !REDIS_URL && UPSTASH_REST_URL && UPSTASH_REST_TOKEN;

if (!REDIS_URL && !useUpstash) {
  console.warn('⚠️  No Redis configured - caching disabled');
}

// Create Redis client or mock for development
export const cache = REDIS_URL
  ? new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
      enableReadyCheck: true,
      enableOfflineQueue: false,
    })
  : useUpstash
  ? createUpstashClient()
  : createMockRedis();

// Upstash REST API client
function createUpstashClient() {
  const client = {
    async get(key: string) {
      const response = await fetch(`${UPSTASH_REST_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
      });
      const data = await response.json();
      return data.result;
    },
    async set(key: string, value: string, _mode?: string, duration?: number) {
      const url = duration
        ? `${UPSTASH_REST_URL}/set/${key}/${value}/EX/${duration}`
        : `${UPSTASH_REST_URL}/set/${key}/${value}`;
      await fetch(url, {
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
      });
    },
    async del(key: string) {
      await fetch(`${UPSTASH_REST_URL}/del/${key}`, {
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
      });
    },
  };
  console.log('✅ Using Upstash REST API');
  return client as any;
}

// Mock Redis for development
function createMockRedis() {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async set(key: string, value: string) {
      store.set(key, value);
    },
    async del(key: string) {
      store.delete(key);
    },
  } as any;
}

// Connect to traditional Redis if used
if (REDIS_URL) {
  cache
    .connect()
    .then(() => console.log('✅ Connected to Redis'))
    .catch((err: Error) => {
      console.error('❌ Failed to connect to Redis:', err);
      console.warn('⚠️  Falling back to in-memory cache');
    });

  cache.on('error', (err: Error) => console.error('Redis error:', err));
  cache.on('reconnecting', () => console.log('🔄 Reconnecting to Redis...'));
  cache.on('ready', () => console.log('✅ Redis ready'));
}

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
