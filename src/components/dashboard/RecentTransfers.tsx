'use client';

import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

export function RecentTransfers({ pollIntervalMs = 5000 }: { pollIntervalMs?: number }) {
  const { data, isLoading } = trpc.transfer.recent.useQuery(
    { limit: 10, includeAttribution: true },
    { refetchInterval: pollIntervalMs }
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent transfers</h3>
        <span className="text-xs text-muted-foreground">Live feed</span>
      </div>
      <div className="space-y-2 text-sm">
        {isLoading && <p className="text-muted-foreground">Loading transfers...</p>}
        {!isLoading &&
          data?.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/50"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {tx.from} → {tx.to}
                </span>
                <span className="text-muted-foreground">
                  {tx.status} ·{' '}
                  {formatDistanceToNow(tx.initiatedAt, {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="text-right">
                <span className="block font-semibold">${tx.amountUsd.toLocaleString()}</span>
                {tx.dappId && (
                  <span className="text-xs text-muted-foreground">
                    via {tx.dappId} ({tx.attributionConfidence ?? 0}%)
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default RecentTransfers;

