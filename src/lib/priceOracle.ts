import { cache, CacheKeys, CacheTTL } from './cache';
import { db } from './db';
import axios from 'axios';

// CoinGecko API for price fallback
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Common token addresses on Base (lowercase)
const KNOWN_TOKENS: Record<string, { coingeckoId: string; symbol: string }> = {
  // Native/Wrapped tokens
  '0x4200000000000000000000000000000000000006': { coingeckoId: 'weth', symbol: 'WETH' },
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { coingeckoId: 'dai', symbol: 'DAI' },
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { coingeckoId: 'usd-coin', symbol: 'USDC' },
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': { coingeckoId: 'usdbase', symbol: 'USDbC' },
  // Add more as needed
};

export interface TokenPrice {
  priceUsd: number;
  timestamp: Date;
  source: 'CHAINLINK' | 'COINGECKO' | 'PYTH' | 'ESTIMATED' | 'MANUAL';
  volume24h?: number;
  marketCap?: number;
}

/**
 * Get current USD price for a token
 */
export async function getTokenPrice(address: string): Promise<TokenPrice | null> {
  const addr = address.toLowerCase();

  // Check cache first
  const cacheKey = CacheKeys.tokenPrice(addr);
  const cached = await cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Try to get price from various sources
  let price: TokenPrice | null = null;

  // 1. Try database (recent price)
  try {
    const recentPrice = await db.tokenPrice.findFirst({
      where: {
        tokenId: addr,
        timestamp: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Within last 5 minutes
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (recentPrice) {
      price = {
        priceUsd: Number(recentPrice.priceUsd),
        timestamp: recentPrice.timestamp,
        source: recentPrice.source,
        volume24h: recentPrice.volume24h ? Number(recentPrice.volume24h) : undefined,
        marketCap: recentPrice.marketCap ? Number(recentPrice.marketCap) : undefined,
      };
    }
  } catch (err) {
    console.error('Error fetching price from database:', err);
  }

  // 2. If no recent price, fetch from external sources
  if (!price) {
    price = await fetchPriceFromExternalSources(addr);
  }

  // Store in database and cache if we got a price
  if (price) {
    try {
      await db.tokenPrice.create({
        data: {
          tokenId: addr,
          priceUsd: price.priceUsd,
          source: price.source,
          timestamp: price.timestamp,
          volume24h: price.volume24h,
          marketCap: price.marketCap,
        },
      });
    } catch (err) {
      // Ignore duplicate key errors
      if (!(err instanceof Error && err.message.includes('Unique constraint'))) {
        console.error('Error storing price in database:', err);
      }
    }

    // Cache the result
    await cache.set(cacheKey, JSON.stringify(price), 'EX', CacheTTL.TOKEN_PRICE);
  }

  return price;
}

/**
 * Get historical price for a token at a specific timestamp
 */
export async function getHistoricalTokenPrice(
  address: string,
  timestamp: Date
): Promise<TokenPrice | null> {
  const addr = address.toLowerCase();
  const timestampMs = timestamp.getTime();

  // Check cache
  const cacheKey = CacheKeys.tokenPrice(addr, timestampMs);
  const cached = await cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Try database first (look for price within ±30 minutes)
  try {
    const historicalPrice = await db.tokenPrice.findFirst({
      where: {
        tokenId: addr,
        timestamp: {
          gte: new Date(timestampMs - 30 * 60 * 1000),
          lte: new Date(timestampMs + 30 * 60 * 1000),
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    if (historicalPrice) {
      const price: TokenPrice = {
        priceUsd: Number(historicalPrice.priceUsd),
        timestamp: historicalPrice.timestamp,
        source: historicalPrice.source,
      };

      // Cache historical prices longer
      await cache.set(cacheKey, JSON.stringify(price), 'EX', CacheTTL.TOKEN_PRICE_HISTORICAL);
      return price;
    }
  } catch (err) {
    console.error('Error fetching historical price from database:', err);
  }

  // If not in database, try to fetch from CoinGecko historical API
  const knownToken = KNOWN_TOKENS[addr];
  if (knownToken) {
    try {
      const price = await fetchHistoricalPriceFromCoinGecko(knownToken.coingeckoId, timestamp);
      if (price) {
        // Store in database for future use
        try {
          await db.tokenPrice.create({
            data: {
              tokenId: addr,
              priceUsd: price.priceUsd,
              source: price.source,
              timestamp: price.timestamp,
            },
          });
        } catch (err) {
          console.error('Error storing historical price:', err);
        }

        await cache.set(cacheKey, JSON.stringify(price), 'EX', CacheTTL.TOKEN_PRICE_HISTORICAL);
        return price;
      }
    } catch (err) {
      console.error('Error fetching historical price from CoinGecko:', err);
    }
  }

  // No fallback - historical price is required for accurate analytics
  console.error(`Historical price not available for ${addr} at ${timestamp}`);
  return null;
}

/**
 * Fetch price from external sources (CoinGecko, Chainlink, Pyth)
 */
async function fetchPriceFromExternalSources(address: string): Promise<TokenPrice | null> {
  const addr = address.toLowerCase();

  // Try CoinGecko
  const knownToken = KNOWN_TOKENS[addr];
  if (knownToken) {
    try {
      const response = await axios.get(`${COINGECKO_API_BASE}/simple/price`, {
        params: {
          ids: knownToken.coingeckoId,
          vs_currencies: 'usd',
          include_24hr_vol: true,
          include_market_cap: true,
        },
        timeout: 5000,
      });

      const data = response.data[knownToken.coingeckoId];
      if (data?.usd) {
        return {
          priceUsd: data.usd,
          timestamp: new Date(),
          source: 'COINGECKO',
          volume24h: data.usd_24h_vol,
          marketCap: data.usd_market_cap,
        };
      }
    } catch (err) {
      console.error(`Error fetching price from CoinGecko for ${knownToken.coingeckoId}:`, err);
    }
  }

  // TODO: Add Chainlink price feed integration
  // TODO: Add Pyth price feed integration

  // If all else fails, return null
  console.warn(`Unable to fetch price for token ${addr}`);
  return null;
}

/**
 * Fetch historical price from CoinGecko
 */
async function fetchHistoricalPriceFromCoinGecko(
  coingeckoId: string,
  timestamp: Date
): Promise<TokenPrice | null> {
  try {
    const unixTimestamp = Math.floor(timestamp.getTime() / 1000);
    const response = await axios.get(`${COINGECKO_API_BASE}/coins/${coingeckoId}/market_chart/range`, {
      params: {
        vs_currency: 'usd',
        from: unixTimestamp - 3600, // 1 hour before
        to: unixTimestamp + 3600, // 1 hour after
      },
      timeout: 10000,
    });

    const prices = response.data.prices as [number, number][]; // [timestamp_ms, price]
    if (prices && prices.length > 0) {
      // Find closest price to the requested timestamp
      const closestPrice = prices.reduce((prev, curr) => {
        return Math.abs(curr[0] - timestamp.getTime()) < Math.abs(prev[0] - timestamp.getTime())
          ? curr
          : prev;
      });

      return {
        priceUsd: closestPrice[1],
        timestamp: new Date(closestPrice[0]),
        source: 'COINGECKO',
      };
    }
  } catch (err) {
    console.error(`Error fetching historical price from CoinGecko for ${coingeckoId}:`, err);
  }

  return null;
}

/**
 * Batch fetch prices for multiple tokens
 */
export async function getBatchTokenPrices(addresses: string[]): Promise<Map<string, TokenPrice>> {
  const results = new Map<string, TokenPrice>();

  // Fetch in parallel with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const prices = await Promise.all(batch.map((addr) => getTokenPrice(addr)));

    batch.forEach((addr, idx) => {
      if (prices[idx]) {
        results.set(addr.toLowerCase(), prices[idx]!);
      }
    });
  }

  return results;
}

/**
 * Add a new token to the known tokens list (for admin/setup)
 */
export function registerKnownToken(address: string, coingeckoId: string, symbol: string) {
  KNOWN_TOKENS[address.toLowerCase()] = { coingeckoId, symbol };
}

/**
 * Calculate USD value for a token amount
 */
export async function calculateUsdValue(
  tokenAddress: string,
  amount: string,
  decimals: number,
  timestamp?: Date
): Promise<number | null> {
  const normalizedAmount = Number(amount) / Math.pow(10, decimals);

  const price = timestamp
    ? await getHistoricalTokenPrice(tokenAddress, timestamp)
    : await getTokenPrice(tokenAddress);

  if (!price) return null;

  return normalizedAmount * price.priceUsd;
}
