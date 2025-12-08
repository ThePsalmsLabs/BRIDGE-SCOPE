'use client';

import { trpc } from '@/lib/trpc';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function VolumeChart() {
  const { data, isLoading } = trpc.stats.volumeSeries.useQuery({ timeframe: '7d' });
  const points = data?.points ?? [];

  return (
    <div className="h-full rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Volume</h3>
        <span className="text-xs text-muted-foreground">
          {data?.timeframe?.toUpperCase() ?? '7D'} · {data?.source ?? 'mock'}
        </span>
      </div>
      <div className="h-64">
        {isLoading && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading chart...
          </div>
        )}
        {!isLoading && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v) => new Date(v).toLocaleDateString()}
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                dataKey="volumeUsd"
                tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => `$${value.toLocaleString()}`}
                labelFormatter={(label) => new Date(label).toLocaleString()}
              />
              <Area type="monotone" dataKey="volumeUsd" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
              <Area type="monotone" dataKey="transfers" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default VolumeChart;

