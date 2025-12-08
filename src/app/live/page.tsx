"use client";

import RecentTransfers from "@/components/dashboard/RecentTransfers";
import { trpc } from "@/lib/trpc";

export default function LivePage() {
  const { data } = trpc.transfer.liveCount.useQuery(undefined, { refetchInterval: 5000 });

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Live monitoring</p>
          <h1 className="text-3xl font-semibold">Recent Transfers</h1>
        </div>
        {data && (
          <div className="text-sm text-muted-foreground">
            Pending: <span className="font-semibold text-foreground">{data.pending}</span> · Completed:{' '}
            <span className="font-semibold text-foreground">{data.completed}</span>
          </div>
        )}
      </div>
      <RecentTransfers pollIntervalMs={4000} />
    </main>
  );
}

