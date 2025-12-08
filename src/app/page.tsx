export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-4">
            Bridge<span className="text-purple-400">Scope</span>
          </h1>
          <p className="text-xl text-slate-400">
            Track dApp activity across Base ↔ Solana bridge
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <StatCard
            label="Total Transfers"
            value="60"
            change="+12%"
          />
          <StatCard
            label="Active dApps"
            value="5"
            change="New"
          />
          <StatCard
            label="Volume (24h)"
            value="$45K"
            change="+23%"
          />
        </div>
        
        <div className="text-center text-slate-500 space-y-3">
          <p>Data loading from The Graph subgraphs...</p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/dashboard"
              className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              View dashboard
            </a>
            <a
              href="/live"
              className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-white/40"
            >
              Live transfers
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
      <p className="text-slate-400 text-sm mb-2">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-white">{value}</p>
        <span className="text-green-400 text-sm">{change}</span>
      </div>
    </div>
  );
}