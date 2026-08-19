import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureReferralLinksForEligibleClients } from "@/lib/referral-service";
import { REFERRAL_ELIGIBILITY_SCORE_THRESHOLD, REFERRAL_CONVERSION_BONUS_POINTS } from "@/lib/referral";
import { TierBadge } from "@/components/Badge";
import { simulateConversion } from "@/app/referrals/actions";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  await ensureReferralLinksForEligibleClients();

  const links = await prisma.referralLink.findMany({
    include: { client: true },
    orderBy: { createdAt: "asc" },
  });

  const totalActiveClients = await prisma.client.count({ where: { status: "ACTIVE" } });
  const notYetLinked = totalActiveClients - links.length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Referral Flywheel</h1>
          <p className="text-sm text-slate-500 mt-1">
            Auto-generated once a client&apos;s Producer Score crosses {REFERRAL_ELIGIBILITY_SCORE_THRESHOLD}.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white mt-6">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Client</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Link</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Clicks</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Conversions</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Reward</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {links.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No clients have crossed the eligibility score yet this period.
                </td>
              </tr>
            ) : (
              links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${link.clientId}`} className="font-medium text-slate-900 hover:underline">
                      {link.client.name}
                    </Link>
                    <div className="mt-0.5">
                      <TierBadge tier={link.client.tier} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">/r/{link.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{link.clicks}</td>
                  <td className="px-4 py-3 text-slate-600">{link.conversions}</td>
                  <td className="px-4 py-3">
                    {link.rewardCredited ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Credited
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={simulateConversion.bind(null, link.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        title={`Credits +${REFERRAL_CONVERSION_BONUS_POINTS} Gauntlet points`}
                      >
                        Simulate Conversion
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {notYetLinked > 0 && `${notYetLinked} active client(s) haven't crossed the eligibility score yet. `}
        Visit a client&apos;s link at <code className="text-slate-500">/r/&lt;slug&gt;</code> to record a real click —
        &quot;Simulate Conversion&quot; stands in for a real signup until HubSpot is wired up.
      </p>
    </div>
  );
}
