/**
 * Coach Prep Briefs — Master Brief Module 3.
 *
 * Pure rule-based templating over data already pulled from the Ledger. This
 * file makes no network calls, no database calls, and no LLM/AI calls of any
 * kind — every line below is straight arithmetic and string interpolation
 * over the input object. That's a deliberate constraint, not an oversight:
 * see Master Brief Part 3 ("no AI/LLM calls anywhere in v1").
 */

import { ActivityType } from "@prisma/client";
import { CATEGORY_LABELS, SCORE_CATEGORIES, type CategoryBreakdown } from "@/lib/scoring";
import { ACTIVITY_TYPE_LABELS } from "@/lib/activity";

const ATTENTION_THRESHOLD = 50;
const RECENT_WINDOW_DAYS = 30;

const CATEGORY_TALKING_POINTS: Record<(typeof SCORE_CATEGORIES)[number], string> = {
  timeManagement: "Revisit their weekly planning/check-in cadence — this is the softest category right now.",
  prospecting: "Prospecting volume is below target — ask what's blocking outbound activity this period.",
  closing: "Closing activity is light — review what's stuck in their pipeline.",
  accountability: "Accountability touches (calls, follow-ups) are below target — confirm the coaching cadence is landing.",
};

export interface CoachPrepActivity {
  type: ActivityType;
  value: number;
  notes: string | null;
  occurredAt: Date;
}

export interface CoachPrepWin {
  description: string;
  metricImproved: string;
  percentGain: number;
  occurredAt: Date;
}

export interface CoachPrepInput {
  clientName: string;
  now: Date;
  currentScore: { producerScore: number; categoryBreakdown: CategoryBreakdown } | null;
  priorScore: { producerScore: number } | null;
  recentActivities: CoachPrepActivity[];
  wins: CoachPrepWin[];
  gauntlet: { points: number; tierRank: number | null; tripEarned: boolean } | null;
  referral: { clicks: number; conversions: number } | null;
}

export interface CoachPrepBrief {
  headline: string;
  scoreTrendLine: string;
  focusAreas: string[];
  activitySummary: string;
  recentActivityLines: string[];
  winHighlights: string[];
  talkingPoints: string[];
  gauntletLine: string;
  referralLine: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildCoachPrepBrief(input: CoachPrepInput): CoachPrepBrief {
  const { clientName, now, currentScore, priorScore, recentActivities, wins, gauntlet, referral } = input;

  const producerScore = currentScore?.producerScore ?? null;

  const headline =
    producerScore === null
      ? `${clientName} has no activity logged yet this period.`
      : producerScore >= 80
      ? `${clientName} is trending strong at ${producerScore}.`
      : producerScore >= 50
      ? `${clientName} is steady at ${producerScore} — there's room to push.`
      : `${clientName} is below target at ${producerScore} — worth addressing this call.`;

  const trend = currentScore && priorScore ? currentScore.producerScore - priorScore.producerScore : null;
  const scoreTrendLine =
    trend === null
      ? "No prior-period score to compare against yet."
      : trend > 0
      ? `Up ${trend} pts vs last period.`
      : trend < 0
      ? `Down ${Math.abs(trend)} pts vs last period — ask what changed.`
      : "Flat vs last period.";

  const focusAreas = currentScore
    ? SCORE_CATEGORIES.filter((category) => currentScore.categoryBreakdown[category].score < ATTENTION_THRESHOLD).map(
        (category) => {
          const entry = currentScore.categoryBreakdown[category];
          return `${CATEGORY_LABELS[category]} (${entry.raw}/${entry.target}): ${CATEGORY_TALKING_POINTS[category]}`;
        }
      )
    : [];

  const windowStart = new Date(now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const recentWindow = recentActivities.filter((a) => a.occurredAt >= windowStart);
  const countsByType = recentWindow.reduce((counts, activity) => {
    counts[activity.type] = (counts[activity.type] ?? 0) + 1;
    return counts;
  }, {} as Partial<Record<ActivityType, number>>);
  const countsSummary = Object.entries(countsByType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${count} ${ACTIVITY_TYPE_LABELS[type as ActivityType]}`)
    .join(", ");
  const activitySummary =
    recentWindow.length === 0
      ? `No activity logged in the last ${RECENT_WINDOW_DAYS} days.`
      : `Last ${RECENT_WINDOW_DAYS} days: ${recentWindow.length} activities (${countsSummary}).`;

  const recentActivityLines = recentActivities
    .slice(0, 10)
    .map((a) => `${formatDate(a.occurredAt)} — ${ACTIVITY_TYPE_LABELS[a.type]}${a.notes ? `: ${a.notes}` : ""}`);

  const winHighlights =
    wins.length > 0
      ? wins.slice(0, 3).map((w) => `${w.description} (+${w.percentGain}% ${w.metricImproved}, ${formatDate(w.occurredAt)})`)
      : ["No wins logged this period — ask what's not being captured."];

  const talkingPoints = [
    scoreTrendLine,
    ...focusAreas,
    ...(wins.length > 0 ? [`Celebrate: ${wins[0].description}`] : []),
    ...(recentWindow.length === 0 ? [`No activity in ${RECENT_WINDOW_DAYS} days — check in on capacity/bandwidth.`] : []),
  ];

  const gauntletLine = gauntlet
    ? `#${gauntlet.tierRank ?? "—"} on the Gauntlet with ${gauntlet.points} pts this month${
        gauntlet.tripEarned ? " — trip earned!" : ""
      }`
    : "No Gauntlet standing computed for this period yet.";

  const referralLine = referral
    ? `Referral link live — ${referral.clicks} click(s), ${referral.conversions} conversion(s).`
    : "Not yet eligible for a referral link.";

  return {
    headline,
    scoreTrendLine,
    focusAreas,
    activitySummary,
    recentActivityLines,
    winHighlights,
    talkingPoints,
    gauntletLine,
    referralLine,
  };
}
