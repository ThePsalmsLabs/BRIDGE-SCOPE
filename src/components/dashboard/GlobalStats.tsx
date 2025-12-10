'use client';

import { trpc } from '@/lib/trpc';

export function GlobalStats() {
  const { data, isLoading } = trpc.stats.global.useQuery({ timeframe: '24h' });
  const avgTransferRaw =
    typeof data?.averageTransferSize === 'number'
      ? data.averageTransferSize
      : typeof data?.averageFee === 'number'
        ? data.averageFee
        : null;
  const avgTransfer: number | null = avgTransferRaw !== null ? Number(avgTransferRaw) : null;
  const stats = data
    ? [
        { label: '24h Volume', value: `$${((data.volume24h ?? 0) / 1_000_000).toFixed(2)}M` },
        { label: 'Transfers', value: (data.transfers ?? 0).toLocaleString() },
        { label: 'Active dApps', value: (data.activeDapps ?? 0).toString() },
        {
          label: 'Avg. Transfer Size',
          value: avgTransfer !== null ? `$${avgTransfer.toFixed(2)}` : '-',
        },
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

