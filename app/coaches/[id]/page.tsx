import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { periodKey, formatPeriodLabel } from "@/lib/scoring";
import { periodKeyFor } from "@/lib/periods";
import { recomputeGauntletForPeriod } from "@/lib/gauntlet-service";
import { TierBadge, StatusBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function CoachDetailPage({ params }: { params: { id: string } }) {
  const coach = await prisma.coach.findUnique({ where: { id: params.id } });
  if (!coach) notFound();

  const currentPeriod = periodKey(new Date());
  const gauntletPeriod = periodKeyFor(new Date(), "monthly");
  await recomputeGauntletForPeriod(gauntletPeriod, "monthly");

  const clients = await prisma.client.findMany({
    where: { coachId: coach.id },
    include: {
      scores: { where: { period: currentPeriod } },
      gauntletEntries: { where: { period: gauntletPeriod } },
      activities: { orderBy: { occurredAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Link href="/coaches" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to Coaches
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-1">{coach.name}</h1>
      <p className="text-sm text-slate-500 mb-6">
        {clients.length} client(s) · {formatPeriodLabel(currentPeriod)}
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Client</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Producer Score</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Gauntlet Rank</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Last Activity</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/clients/${client.id}`} className="font-medium text-slate-900 hover:underline">
                    {client.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <TierBadge tier={client.tier} />
                    <StatusBadge status={client.status} />
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{client.scores[0]?.producerScore ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {client.gauntletEntries[0]?.tierRank ? `#${client.gauntletEntries[0].tierRank}` : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {client.activities[0]
                    ? client.activities[0].occurredAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/clients/${client.id}/brief`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View Prep Brief
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
