import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/app/clients/actions";

export default async function NewClientPage() {
  const coaches = await prisma.coach.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-lg">
      <Link href="/clients" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to Clients
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-6">Add Client</h1>

      <form action={createClient} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="client@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tier</label>
          <select name="tier" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="ELITE">Elite</option>
            <option value="FOUNDERS">Founder&apos;s Circle</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Coach</label>
          <select name="coachId" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.name} ({coach.currentClientCount}/{coach.clientCapacity})
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Add Client
        </button>
      </form>
    </div>
  );
}
