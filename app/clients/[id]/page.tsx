import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABELS,
  SCORE_CATEGORIES,
  formatPeriodLabel,
  periodKey,
  previousPeriod,
  type CategoryBreakdown,
} from "@/lib/scoring";
import { periodKeyFor } from "@/lib/periods";
import { rewardTierFor } from "@/lib/gauntlet";
import { TierBadge, StatusBadge } from "@/components/Badge";
import { ScoreBar, ProducerScoreDial } from "@/components/ScoreBar";
import {
  logActivity,
  deleteActivity,
  logWin,
  deleteWin,
  toggleWinAdReady,
  recomputeScoreAction,
} from "@/app/clients/[id]/actions";

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

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      coach: true,
      activities: { orderBy: { occurredAt: "desc" }, take: 25 },
      wins: { orderBy: { occurredAt: "desc" } },
    },
  });

  if (!client) notFound();

  const currentPeriod = periodKey(new Date());
  const priorPeriod = previousPeriod(currentPeriod);

  const gauntletPeriod = periodKeyFor(new Date(), "monthly");

  const [currentScore, priorScore, gauntletEntry] = await Promise.all([
    prisma.score.findUnique({ where: { clientId_period: { clientId: client.id, period: currentPeriod } } }),
    prisma.score.findUnique({ where: { clientId_period: { clientId: client.id, period: priorPeriod } } }),
    prisma.gauntletEntry.findUnique({
      where: { clientId_period: { clientId: client.id, period: gauntletPeriod } },
    }),
  ]);
  const gauntletTier = gauntletEntry ? rewardTierFor(gauntletEntry.points) : null;

  const breakdown = (currentScore?.categoryBreakdown ?? null) as CategoryBreakdown | null;
  const trend =
    currentScore && priorScore ? currentScore.producerScore - priorScore.producerScore : null;

  return (
    <div>
      <Link href="/clients" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to Clients
      </Link>

      <div className="mt-2 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <p className="text-sm text-slate-500">{client.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <TierBadge tier={client.tier} />
            <StatusBadge status={client.status} />
            <span className="text-sm text-slate-500">
              Coach: {client.coach?.name ?? "Unassigned"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            <Link href="/gauntlet" className="hover:underline">
              Gauntlet
            </Link>
            :{" "}
            {gauntletEntry ? (
              <>
                #{gauntletEntry.tierRank} · {gauntletEntry.points} pts
                {gauntletTier && <span className="text-slate-400"> · {gauntletTier.name}</span>}
                {gauntletEntry.tripEarned && <span className="text-indigo-600"> · ✈ Trip Earned</span>}
              </>
            ) : (
              <span className="text-slate-400">not yet computed for this period</span>
            )}
          </p>
        </div>
        <form action={recomputeScoreAction.bind(null, client.id)}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Recompute Score
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            {formatPeriodLabel(currentPeriod)}
          </h2>
          <div className="flex items-center justify-center mb-6">
            <ProducerScoreDial score={currentScore?.producerScore ?? 0} />
          </div>
          {trend !== null && (
            <p className="text-center text-sm mb-4">
              <span className={trend >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)} pts
              </span>{" "}
              <span className="text-slate-400">vs {formatPeriodLabel(priorPeriod)}</span>
            </p>
          )}
          <div className="space-y-4">
            {breakdown
              ? SCORE_CATEGORIES.map((category) => (
                  <ScoreBar
                    key={category}
                    label={CATEGORY_LABELS[category]}
                    score={breakdown[category].score}
                    detail={`${breakdown[category].raw}/${breakdown[category].target}`}
                  />
                ))
              : (
                <p className="text-sm text-slate-400">
                  No score computed yet for this period. Log an activity or recompute.
                </p>
              )}
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Log Activity
            </h2>
            <form action={logActivity.bind(null, client.id)} className="grid grid-cols-2 gap-3">
              <select name="type" required className="col-span-1 rounded-md border border-slate-300 px-3 py-2 text-sm">
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                name="value"
                type="number"
                min="0"
                step="1"
                defaultValue={1}
                className="col-span-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Value"
              />
              <input
                name="occurredAt"
                type="date"
                className="col-span-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                name="notes"
                className="col-span-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Notes (optional)"
              />
              <button
                type="submit"
                className="col-span-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Log Activity
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Recent Activity
            </h2>
            {client.activities.length === 0 ? (
              <p className="text-sm text-slate-400">No activity logged yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {client.activities.map((activity) => (
                  <li key={activity.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-700">
                        {ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}
                      </span>
                      <span className="text-slate-400"> · {activity.value}</span>
                      {activity.notes && <span className="text-slate-400"> · {activity.notes}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        {activity.occurredAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <form action={deleteActivity.bind(null, activity.id, client.id)}>
                        <button type="submit" className="text-rose-500 hover:text-rose-700">
                          Remove
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Log a Win
            </h2>
            <form action={logWin.bind(null, client.id)} className="grid grid-cols-2 gap-3">
              <input
                name="description"
                required
                className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="What happened?"
              />
              <input
                name="metricImproved"
                required
                className="col-span-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Metric improved"
              />
              <input
                name="percentGain"
                type="number"
                step="1"
                className="col-span-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="% gain"
              />
              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
                <input name="isAdReady" type="checkbox" className="rounded border-slate-300" />
                Ad-ready (surface in Proof Engine later)
              </label>
              <button
                type="submit"
                className="col-span-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Log Win
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Wins
            </h2>
            {client.wins.length === 0 ? (
              <p className="text-sm text-slate-400">No wins logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {client.wins.map((win) => (
                  <li key={win.id} className="rounded-md border border-slate-100 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-slate-700">{win.description}</p>
                        <p className="text-slate-400 mt-1">
                          {win.metricImproved} · +{win.percentGain}% ·{" "}
                          {win.occurredAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <form action={toggleWinAdReady.bind(null, win.id, client.id, !win.isAdReady)}>
                          <button
                            type="submit"
                            className={
                              win.isAdReady
                                ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"
                                : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200"
                            }
                          >
                            {win.isAdReady ? "Ad-ready" : "Mark ad-ready"}
                          </button>
                        </form>
                        <form action={deleteWin.bind(null, win.id, client.id)}>
                          <button type="submit" className="text-xs text-rose-500 hover:text-rose-700">
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
