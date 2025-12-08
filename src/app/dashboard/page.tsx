import { DappLeaderboard } from "@/components/dashboard/DappLeaderboard";
import { GlobalStats } from "@/components/dashboard/GlobalStats";
import { RecentTransfers } from "@/components/dashboard/RecentTransfers";
import { VolumeChart } from "@/components/dashboard/VolumeChart";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col gap-6 bg-background px-6 py-10 text-foreground">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Overview</p>
        <h1 className="text-3xl font-semibold">Bridge Dashboard</h1>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <GlobalStats />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VolumeChart />
        </div>
        <RecentTransfers />
      </section>

      <section>
        <DappLeaderboard />
      </section>
    </main>
  );
}

