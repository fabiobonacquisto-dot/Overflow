import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { periodKey } from "@/lib/scoring";
import { TierBadge, StatusBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const currentPeriod = periodKey(new Date());

  const clients = await prisma.client.findMany({
    include: {
      coach: true,
      scores: { where: { period: currentPeriod } },
    },
    orderBy: { joinedAt: "asc" },
  });

  const withScore = clients
    .map((client) => ({
      ...client,
      producerScore: client.scores[0]?.producerScore ?? null,
    }))
    .sort((a, b) => (b.producerScore ?? -1) - (a.producerScore ?? -1));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-slate-500 mt-1">
            {clients.length} Elite clients on the Ledger · {new Date(currentPeriod + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Add Client
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Client</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Tier</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Coach</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Producer Score</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {withScore.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/clients/${client.id}`} className="font-medium text-slate-900 hover:underline">
                    {client.name}
                  </Link>
                  <div className="text-xs text-slate-400">{client.email}</div>
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier={client.tier} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{client.coach?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3">
                  {client.producerScore !== null ? (
                    <span
                      className={
                        client.producerScore >= 80
                          ? "text-emerald-600 font-semibold"
                          : client.producerScore >= 50
                          ? "text-amber-600 font-semibold"
                          : "text-rose-600 font-semibold"
                      }
                    >
                      {client.producerScore}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {client.joinedAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
