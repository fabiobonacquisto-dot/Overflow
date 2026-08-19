import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CoachesPage() {
  const coaches = await prisma.coach.findMany({
    include: { clients: { where: { status: "ACTIVE" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Coaches</h1>
      <p className="text-sm text-slate-500 mb-6">Roster and capacity — open a coach to see their Prep Brief queue.</p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Coach</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Active Clients</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Capacity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {coaches.map((coach) => (
              <tr key={coach.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/coaches/${coach.id}`} className="font-medium text-slate-900 hover:underline">
                    {coach.name}
                  </Link>
                  <div className="text-xs text-slate-400">{coach.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{coach.clients.length}</td>
                <td className="px-4 py-3 text-slate-600">{coach.clientCapacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
