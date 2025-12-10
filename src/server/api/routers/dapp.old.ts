import { z } from 'zod';

import { DAPP_REGISTRY, SUBGRAPH_URLS } from '@/lib/constants';
import { resolveContractName, resolveTokenMetadata } from '@/lib/onchainMetadata';
import { fetchSubgraphSafe } from '@/lib/subgraph';
import { getDappById, getDapps } from '@/lib/registry';
import { createTRPCRouter, publicProcedure } from '../trpc';

type RawTransfer = {
  to: string;
  amount: string;
  blockTimestamp: string;
  localToken: string;
};

const TIMEFRAMES: Record<'24h' | '7d' | '30d' | 'all', number | null> = {
  '24h': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
  '30d': 30 * 24 * 60 * 60,
  all: null,
};

function registryAddresses() {
  const addrs = DAPP_REGISTRY.flatMap((d) =>
    (d.contracts ?? []).filter((c) => c.chain === 'BASE').map((c) => c.address.toLowerCase())
  );
  return Array.from(new Set(addrs));
}

async function fetchDappTransfers(addresses: string[], timeframe: '24h' | '7d' | '30d' | 'all') {
  if (!addresses.length) return [];
  const seconds = TIMEFRAMES[timeframe];
  const nowSec = Math.floor(Date.now() / 1000);
  const whereTime = seconds ? `, blockTimestamp_gte: ${nowSec - seconds}` : '';
  const query = `
    query DappTransfers {
      transferFinalizeds(
        first: 1000
        orderBy: blockTimestamp
        orderDirection: desc
        where: { to_in: [${addresses.map((a) => `"${a}"`).join(',')} ]${whereTime} }
      ) {
        to
        amount
        blockTimestamp
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

  return baseData.transferFinalizeds;
}

async function fetchRecentTransfers(timeframe: '24h' | '7d' | '30d' | 'all') {
  const seconds = TIMEFRAMES[timeframe];
  const nowSec = Math.floor(Date.now() / 1000);
  const whereTime = seconds ? `, where: { blockTimestamp_gte: ${nowSec - seconds} }` : '';
  const query = `
    {
      transferFinalizeds(first: 1000, orderBy: blockTimestamp, orderDirection: desc${whereTime}) {
        to
        amount
        blockTimestamp
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

  return baseData.transferFinalizeds;
}

async function aggregateByDapp(transfers: RawTransfer[]) {
  const map = new Map<
    string,
    {
      volume: number;
      count: number;
      series: Map<number, { volume: number; count: number }>;
    }
  >();

  // Cache token decimals
  const tokenDecimalsCache = new Map<string, number>();
  const uniqueTokens = Array.from(new Set(transfers.map(t => t.localToken.toLowerCase())));

  await Promise.all(
    uniqueTokens.map(async (tokenAddress) => {
      const meta = await resolveTokenMetadata(tokenAddress);
      tokenDecimalsCache.set(tokenAddress, meta?.decimals ?? 18);
    })
  );

  transfers.forEach((t) => {
    const to = t.to.toLowerCase();
    const decimals = tokenDecimalsCache.get(t.localToken.toLowerCase()) ?? 18;
    const normalizedAmount = Number(t.amount) / Math.pow(10, decimals);

    const entry = map.get(to) ?? { volume: 0, count: 0, series: new Map() };
    entry.volume += normalizedAmount;
    entry.count += 1;

    const day = Math.floor(Number(t.blockTimestamp) / 86400);
    const dayEntry = entry.series.get(day) ?? { volume: 0, count: 0 };
    dayEntry.volume += normalizedAmount;
    dayEntry.count += 1;
    entry.series.set(day, dayEntry);
    map.set(to, entry);
  });

  return map;
}

function asAggMap(
  agg: unknown
): Map<
  string,
  {
    volume: number;
    count: number;
    series: Map<number, { volume: number; count: number }>;
  }
> {
  if (agg instanceof Map) return agg;
  if (!agg || typeof agg !== 'object') return new Map();
  return new Map(Object.entries(agg as Record<string, any>).map(([k, v]) => [k, v]));
}

export const dappRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ input }) => {
      const transfers = await fetchRecentTransfers('7d');
      const agg = asAggMap(await aggregateByDapp(transfers));

      const registry = getDapps();
      const registryAddressesSet = new Set(registryAddresses());

      const known = registry.map((dapp) => {
        const contracts = (dapp.contracts ?? []).filter((c) => c.chain === 'BASE').map((c) => c.address.toLowerCase());
        const metrics = contracts
          .map((addr) => agg.get(addr))
          .filter(Boolean) as Array<{ volume: number; count: number }>;
        const volumeUsd = metrics.reduce((sum, m) => sum + m.volume, 0);
        const transfersCount = metrics.reduce((sum, m) => sum + m.count, 0);
        return { ...dapp, volumeUsd, transfers: transfersCount };
      });

      const unknownEntries = Array.from(agg.entries()).filter(([addr]) => !registryAddressesSet.has(addr));
      const resolvedNames = await Promise.all(
        unknownEntries.map(async ([addr]) => {
          const name = await resolveContractName(addr);
          return { addr, name };
        })
      );

      const unknown = unknownEntries.map(([addr, metrics]) => {
        const foundName = resolvedNames.find((r) => r.addr === addr)?.name;
        return {
          id: `unknown-${addr}`,
          name: foundName ?? `Unknown ${addr.slice(0, 6)}...${addr.slice(-4)}`,
          category: 'OTHER' as const,
          volumeUsd: metrics.volume,
          transfers: metrics.count,
          contracts: [{ chain: 'BASE' as const, address: addr }],
        };
      });

      const combined = [...known, ...unknown].sort((a, b) => (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0));

      return input?.limit ? combined.slice(0, input.limit) : combined;
    }),

  byId: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const dapp = getDappById(input.id);
    if (!dapp) return null;
    const addrs = (dapp.contracts ?? []).filter((c) => c.chain === 'BASE').map((c) => c.address.toLowerCase());
    const transfers = await fetchDappTransfers(addrs, '30d');
    const agg = asAggMap(await aggregateByDapp(transfers));
    const volumeUsd = addrs.reduce((sum, addr) => sum + (agg.get(addr)?.volume ?? 0), 0);
    const transfersCount = addrs.reduce((sum, addr) => sum + (agg.get(addr)?.count ?? 0), 0);
    return { ...dapp, volumeUsd, transfers: transfersCount };
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
      if (!dapp) return null;

      const addrs = (dapp.contracts ?? []).filter((c) => c.chain === 'BASE').map((c) => c.address.toLowerCase());
      const transfers = await fetchDappTransfers(addrs, input.timeframe);
      const agg = asAggMap(await aggregateByDapp(transfers));
      const volumeUsd = addrs.reduce((sum, addr) => sum + (agg.get(addr)?.volume ?? 0), 0);
      const transfersCount = addrs.reduce((sum, addr) => sum + (agg.get(addr)?.count ?? 0), 0);

      const days = input.timeframe === '30d' ? 30 : input.timeframe === '7d' ? 7 : 1;
      const series = (() => {
        const today = Math.floor(Date.now() / 1000 / 86400);
        return Array.from({ length: days }).map((_, idx) => {
          const day = today - (days - 1 - idx);
          const dayMetrics = addrs.reduce(
            (acc, addr) => {
              const s = agg.get(addr)?.series.get(day) ?? { volume: 0, count: 0 };
              return { volume: acc.volume + s.volume, count: acc.count + s.count };
            },
            { volume: 0, count: 0 }
          );
          return {
            timestamp: day * 86400 * 1000,
            value: dayMetrics.volume,
            transfers: dayMetrics.count,
          };
        });
      })();

      return {
        dapp,
        timeframe: input.timeframe,
        totals: {
          volumeUsd,
          transfers: transfersCount,
          uniqueUsers: null,
        },
        directionBreakdown: null,
        timeseries: series,
      };
    }),
});