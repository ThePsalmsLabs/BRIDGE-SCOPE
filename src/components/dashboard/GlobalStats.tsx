'use client';

import { trpc } from '@/lib/trpc';

export function GlobalStats() {
  const { data, isLoading } = trpc.stats.global.useQuery({ timeframe: '24h' });
  const stats = data
    ? [
        { label: '24h Volume', value: `$${(data.volume24h / 1_000_000).toFixed(2)}M` },
        { label: 'Transfers', value: data.transfers.toLocaleString() },
        { label: 'Active dApps', value: data.activeDapps.toString() },
        { label: 'Avg. Fee', value: `$${data.averageFee.toFixed(2)}` },
      ]
    : [];

  return (
    <>
      {isLoading && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Loading stats...</p>
        </div>
      )}
      {!isLoading &&
        stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
    </>
  );
}

export default GlobalStats;

