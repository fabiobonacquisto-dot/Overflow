import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPeriodLabel, periodKey } from "@/lib/scoring";
import { TierBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Coaching Call",
  PROSPECTING: "Prospecting",
  CLOSE: "Close",
  REFERRAL_SENT: "Referral Sent",
  FOLLOW_UP: "Follow-up",
  CHECK_IN: "Check-in",
  PLANNING: "Planning",
  TRAINING: "Training",
};

export default async function DashboardPage() {
  const currentPeriod = periodKey(new Date());

  const [clients, scores, recentActivities, adReadyWinCount] = await Promise.all([
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.score.findMany({ where: { period: currentPeriod } }),
    prisma.activity.findMany({
      orderBy: { occurredAt: "desc" },
      take: 8,
      include: { client: true },
    }),
    prisma.win.count({ where: { isAdReady: true } }),
  ]);

  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s.producerScore, 0) / scores.length)
    : 0;

  const topProducers = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    include: { scores: { where: { period: currentPeriod } } },
  });

  const ranked = topProducers
    .map((c) => ({ ...c, producerScore: c.scores[0]?.producerScore ?? 0 }))
    .sort((a, b) => b.producerScore - a.producerScore)
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Ledger Dashboard</h1>
      <p className="text-sm text-slate-500 mb-8">{formatPeriodLabel(currentPeriod)}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Active Elite Clients" value={clients} />
        <StatCard label="Avg Producer Score" value={avgScore} />
        <StatCard label="Ad-Ready Wins" value={adReadyWinCount} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Top Producers
            </h2>
            <Link href="/clients" className="text-sm text-slate-500 hover:text-slate-900">
              View all →
            </Link>
          </div>
          <ol className="space-y-3">
            {ranked.map((client, index) => (
              <li key={client.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-slate-400">{index + 1}</span>
                  <Link href={`/clients/${client.id}`} className="font-medium text-slate-800 hover:underline">
                    {client.name}
                  </Link>
                  <TierBadge tier={client.tier} />
                </div>
                <span className="font-semibold text-slate-700">{client.producerScore}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Recent Activity
          </h2>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-slate-400">No activity logged yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="py-2 text-sm">
                  <Link href={`/clients/${activity.clientId}`} className="font-medium text-slate-800 hover:underline">
                    {activity.client.name}
                  </Link>{" "}
                  <span className="text-slate-500">
                    logged {ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}
                  </span>
                  <span className="text-slate-400">
                    {" "}
                    · {activity.occurredAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
