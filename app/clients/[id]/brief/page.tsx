import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { periodKey, previousPeriod, type CategoryBreakdown } from "@/lib/scoring";
import { periodKeyFor } from "@/lib/periods";
import { buildCoachPrepBrief } from "@/lib/coach-prep";

export const dynamic = "force-dynamic";

export default async function CoachPrepBriefPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { coach: true },
  });

  if (!client) notFound();

  const currentPeriod = periodKey(new Date());
  const priorPeriod = previousPeriod(currentPeriod);
  const gauntletPeriod = periodKeyFor(new Date(), "monthly");

  const [currentScore, priorScore, recentActivities, wins, gauntletEntry, referralLink] = await Promise.all([
    prisma.score.findUnique({ where: { clientId_period: { clientId: client.id, period: currentPeriod } } }),
    prisma.score.findUnique({ where: { clientId_period: { clientId: client.id, period: priorPeriod } } }),
    prisma.activity.findMany({
      where: { clientId: client.id },
      orderBy: { occurredAt: "desc" },
      take: 15,
    }),
    prisma.win.findMany({ where: { clientId: client.id }, orderBy: { occurredAt: "desc" }, take: 5 }),
    prisma.gauntletEntry.findUnique({
      where: { clientId_period: { clientId: client.id, period: gauntletPeriod } },
    }),
    prisma.referralLink.findUnique({ where: { clientId: client.id } }),
  ]);

  const brief = buildCoachPrepBrief({
    clientName: client.name,
    now: new Date(),
    currentScore: currentScore
      ? { producerScore: currentScore.producerScore, categoryBreakdown: currentScore.categoryBreakdown as unknown as CategoryBreakdown }
      : null,
    priorScore: priorScore ? { producerScore: priorScore.producerScore } : null,
    recentActivities,
    wins,
    gauntlet: gauntletEntry
      ? { points: gauntletEntry.points, tierRank: gauntletEntry.tierRank, tripEarned: gauntletEntry.tripEarned }
      : null,
    referral: referralLink ? { clicks: referralLink.clicks, conversions: referralLink.conversions } : null,
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link href={`/clients/${client.id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to {client.name}
        </Link>
        <p className="text-xs text-slate-400">Use your browser&apos;s Print / Save as PDF to take this into a call.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-8 print:border-none print:p-0">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
          Coach Prep Brief — not client-facing
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
        <p className="text-sm text-slate-500 mb-6">
          {client.tier === "FOUNDERS" ? "Founder's Circle" : "Elite"} · Coach: {client.coach?.name ?? "Unassigned"}
        </p>

        <p className="text-base text-slate-800 mb-6">{brief.headline}</p>

        <Section title="Talking Points">
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
            {brief.talkingPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </Section>

        <Section title="Score Snapshot">
          <p className="text-sm text-slate-700">{brief.scoreTrendLine}</p>
          {brief.focusAreas.length > 0 && (
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 mt-2">
              {brief.focusAreas.map((area, i) => (
                <li key={i}>{area}</li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Recent Activity">
          <p className="text-sm text-slate-600 mb-2">{brief.activitySummary}</p>
          {brief.recentActivityLines.length > 0 ? (
            <ul className="space-y-1 text-sm text-slate-600">
              {brief.recentActivityLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No activity logged yet.</p>
          )}
        </Section>

        <Section title="Wins">
          <ul className="space-y-1 text-sm text-slate-700">
            {brief.winHighlights.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </Section>

        <Section title="Other Modules">
          <p className="text-sm text-slate-600">{brief.gauntletLine}</p>
          <p className="text-sm text-slate-600">{brief.referralLine}</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{title}</h2>
      {children}
    </div>
  );
}
