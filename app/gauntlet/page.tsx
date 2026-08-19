import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { recomputeGauntletForPeriod } from "@/lib/gauntlet-service";
import { REWARD_TIERS, rewardTierFor } from "@/lib/gauntlet";
import { PERIOD_TYPES, PERIOD_TYPE_LABELS, periodKeyFor, formatPeriodLabelFor, type PeriodType } from "@/lib/periods";
import { TierBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

function isPeriodType(value: string | undefined): value is PeriodType {
  return PERIOD_TYPES.includes(value as PeriodType);
}

function rewardTierStyle(tierName: string | undefined): string {
  switch (tierName) {
    case "Trip Winner":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case "Gold":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "Silver":
      return "bg-slate-100 text-slate-600 ring-slate-300";
    case "Bronze":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    default:
      return "bg-slate-50 text-slate-400 ring-slate-200";
  }
}

export default async function GauntletPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const periodType: PeriodType = isPeriodType(searchParams.period) ? searchParams.period : "monthly";
  const period = periodKeyFor(new Date(), periodType);

  await recomputeGauntletForPeriod(period, periodType);

  const entries = await prisma.gauntletEntry.findMany({
    where: { period },
    include: { client: { include: { coach: true } } },
    orderBy: { tierRank: "asc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">The Gauntlet</h1>
          <p className="text-sm text-slate-500 mt-1">{formatPeriodLabelFor(period, periodType)} leaderboard</p>
        </div>
        <div className="flex rounded-md border border-slate-200 bg-white p-1">
          {PERIOD_TYPES.map((type) => (
            <Link
              key={type}
              href={`/gauntlet?period=${type}`}
              className={
                type === periodType
                  ? "rounded px-3 py-1.5 text-sm font-medium bg-slate-900 text-white"
                  : "rounded px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {PERIOD_TYPE_LABELS[type]}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-6">
        <section className="lg:col-span-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Client</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Coach</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Points</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Reward Tier</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Trip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No activity logged for this period yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const tier = rewardTierFor(entry.points);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-500">#{entry.tierRank}</td>
                      <td className="px-4 py-3">
                        <Link href={`/clients/${entry.clientId}`} className="font-medium text-slate-900 hover:underline">
                          {entry.client.name}
                        </Link>
                        <div className="mt-0.5">
                          <TierBadge tier={entry.client.tier} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entry.client.coach?.name ?? "Unassigned"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{entry.points}</td>
                      <td className="px-4 py-3">
                        {tier ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${rewardTierStyle(
                              tier.name
                            )}`}
                          >
                            {tier.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.tripEarned ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
                            ✈ Trip Earned
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Reward Tiers</h2>
          <p className="text-xs text-slate-400 mb-4">
            Placeholder thresholds pending leadership sign-off on the first real trip reward.
          </p>
          <ul className="space-y-3">
            {REWARD_TIERS.map((tier) => (
              <li key={tier.name} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${rewardTierStyle(
                      tier.name
                    )}`}
                  >
                    {tier.name}
                  </span>
                  <p className="text-slate-500 mt-1">{tier.reward}</p>
                </div>
                <span className="text-slate-400 whitespace-nowrap">{tier.minPoints}+ pts</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
