"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function DappPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, isLoading } = trpc.dapp.activity.useQuery({ id, timeframe: "7d" }, { enabled: Boolean(id) });

  if (!id) return <div className="p-6">Missing dApp id</div>;

  if (isLoading) return <div className="p-6">Loading dApp activity...</div>;

  if (!data) return <div className="p-6">dApp not found</div>;

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">dApp</p>
        <h1 className="text-3xl font-semibold">{data.dapp.name}</h1>
        <p className="text-sm text-muted-foreground">{data.dapp.category}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Volume" value={`$${(data.totals.volumeUsd ?? 0).toLocaleString()}`} />
        <MetricCard label="Transfers" value={(data.totals.transfers ?? 0).toLocaleString()} />
        <MetricCard label="Unique users" value={(data.totals.uniqueUsers ?? 0).toLocaleString()} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Volume over time</h3>
          <span className="text-xs text-muted-foreground">{data.timeframe}</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeseries}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v) => new Date(v).toLocaleDateString()}
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                dataKey="value"
                tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => `$${value.toLocaleString()}`}
                labelFormatter={(label) => new Date(label).toLocaleString()}
              />
              <Area type="monotone" dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

