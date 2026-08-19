import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPeriodLabel, periodKey } from "@/lib/scoring";
import { periodKeyFor } from "@/lib/periods";
import { recomputeGauntletForPeriod } from "@/lib/gauntlet-service";
import { ensureReferralLinksForEligibleClients } from "@/lib/referral-service";
import { ACTIVITY_TYPE_LABELS } from "@/lib/activity";
import { TierBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentPeriod = periodKey(new Date());
  const gauntletPeriod = periodKeyFor(new Date(), "monthly");
  await Promise.all([
    recomputeGauntletForPeriod(gauntletPeriod, "monthly"),
    ensureReferralLinksForEligibleClients(currentPeriod),
  ]);

  const [clients, scores, recentActivities, adReadyWinCount, gauntletLeader, referralLinks, coaches] =
    await Promise.all([
      prisma.client.count({ where: { status: "ACTIVE" } }),
      prisma.score.findMany({ where: { period: currentPeriod } }),
      prisma.activity.findMany({
        orderBy: { occurredAt: "desc" },
        take: 8,
        include: { client: true },
      }),
      prisma.win.count({ where: { isAdReady: true } }),
      prisma.gauntletEntry.findFirst({
        where: { period: gauntletPeriod, tierRank: 1 },
        include: { client: true },
      }),
      prisma.referralLink.findMany(),
      prisma.coach.findMany({
        include: { clients: { where: { status: "ACTIVE" } } },
        orderBy: { name: "asc" },
      }),
    ]);

  const totalConversions = referralLinks.reduce((sum, l) => sum + l.conversions, 0);

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <StatCard label="Active Elite Clients" value={clients} />
        <StatCard label="Avg Producer Score" value={avgScore} />
        <StatCard label="Ad-Ready Wins" value={adReadyWinCount} />
        <Link href="/gauntlet" className="rounded-lg border border-slate-200 bg-white p-6 hover:border-slate-300">
          <p className="text-sm text-slate-500">Gauntlet Leader</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 truncate">
            {gauntletLeader?.client.name ?? "—"}
          </p>
          {gauntletLeader && <p className="text-xs text-slate-400 mt-1">{gauntletLeader.points} pts this month</p>}
        </Link>
        <Link href="/referrals" className="rounded-lg border border-slate-200 bg-white p-6 hover:border-slate-300">
          <p className="text-sm text-slate-500">Referral Conversions</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{totalConversions}</p>
          <p className="text-xs text-slate-400 mt-1">{referralLinks.length} active link(s)</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Coaches</h2>
            <Link href="/coaches" className="text-sm text-slate-500 hover:text-slate-900">
              View all →
            </Link>
          </div>
          <ul className="space-y-3">
            {coaches.map((coach) => (
              <li key={coach.id} className="flex items-center justify-between text-sm">
                <Link href={`/coaches/${coach.id}`} className="font-medium text-slate-800 hover:underline">
                  {coach.name}
                </Link>
                <span className="text-slate-500">
                  {coach.clients.length}/{coach.clientCapacity}
                </span>
              </li>
            ))}
          </ul>
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
