'use client';

import { trpc } from '@/lib/trpc';

export function DappLeaderboard() {
  const { data, isLoading } = trpc.dapp.list.useQuery({ limit: 5 });
  const rows =
    data?.map((dapp) => ({
      name: dapp.name,
      volume: dapp.volumeUsd ?? 0,
      txs: dapp.transfers ?? 0,
    })) ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Top dApps</h3>
        <span className="text-xs text-muted-foreground">Past 7d · subgraph</span>
      </div>
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading leaderboard...</p>}
        {!isLoading &&
          rows.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-muted/50"
            >
              <div className="font-medium">{row.name}</div>
              <div className="text-right text-sm text-muted-foreground">
                <div>${(row.volume / 1_000_000).toFixed(2)}M</div>
                <div>{row.txs.toLocaleString()} txs</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default DappLeaderboard;

