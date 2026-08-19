import { ActivityType } from "@prisma/client";

/**
 * Producer Score engine — composite score per client per period, built from
 * the same four categories as SWC's original coaching diagnostic:
 * Time Management, Prospecting, Closing, Accountability.
 *
 * Each logged Activity maps to exactly one category. A category's raw total
 * (sum of Activity.value for that category in the period) is compared against
 * a target to produce a 0-100 sub-score; the four sub-scores are combined by
 * weight into the composite Producer Score.
 *
 * Targets/weights are placeholders until real top-producer benchmarks are
 * available (see Master Brief Part 9) — swap CATEGORY_TARGETS once that data
 * lands, no schema or call-site changes needed.
 */

export const SCORE_CATEGORIES = [
  "timeManagement",
  "prospecting",
  "closing",
  "accountability",
] as const;

export type ScoreCategory = (typeof SCORE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  timeManagement: "Time Management",
  prospecting: "Prospecting",
  closing: "Closing",
  accountability: "Accountability",
};

export const CATEGORY_BY_ACTIVITY_TYPE: Record<ActivityType, ScoreCategory> = {
  PLANNING: "timeManagement",
  CHECK_IN: "timeManagement",
  PROSPECTING: "prospecting",
  REFERRAL_SENT: "prospecting",
  CLOSE: "closing",
  CALL: "accountability",
  FOLLOW_UP: "accountability",
  TRAINING: "accountability",
};

/** Monthly target totals per category — placeholder until real benchmarks land. */
const CATEGORY_TARGETS: Record<ScoreCategory, number> = {
  timeManagement: 8,
  prospecting: 20,
  closing: 4,
  accountability: 8,
};

const CATEGORY_WEIGHTS: Record<ScoreCategory, number> = {
  timeManagement: 0.25,
  prospecting: 0.25,
  closing: 0.25,
  accountability: 0.25,
};

export interface CategoryBreakdownEntry {
  label: string;
  raw: number;
  target: number;
  score: number;
  weight: number;
}

export type CategoryBreakdown = Record<ScoreCategory, CategoryBreakdownEntry>;

export interface ScoredActivity {
  type: ActivityType;
  value: number;
}

export interface ProducerScoreResult {
  producerScore: number;
  categoryBreakdown: CategoryBreakdown;
}

export function computeProducerScore(activities: ScoredActivity[]): ProducerScoreResult {
  const raw: Record<ScoreCategory, number> = {
    timeManagement: 0,
    prospecting: 0,
    closing: 0,
    accountability: 0,
  };

  for (const activity of activities) {
    const category = CATEGORY_BY_ACTIVITY_TYPE[activity.type];
    raw[category] += activity.value;
  }

  const categoryBreakdown = {} as CategoryBreakdown;
  let producerScore = 0;

  for (const category of SCORE_CATEGORIES) {
    const target = CATEGORY_TARGETS[category];
    const weight = CATEGORY_WEIGHTS[category];
    const score = Math.min(100, Math.round((raw[category] / target) * 100));

    categoryBreakdown[category] = {
      label: CATEGORY_LABELS[category],
      raw: raw[category],
      target,
      score,
      weight,
    };
    producerScore += score * weight;
  }

  return { producerScore: Math.round(producerScore), categoryBreakdown };
}

/** Period key for a date, e.g. "2026-08" (calendar month). */
export function periodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function periodBounds(period: string): { start: Date; end: Date } {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export function previousPeriod(period: string): string {
  const { start } = periodBounds(period);
  start.setMonth(start.getMonth() - 1);
  return periodKey(start);
}

export function formatPeriodLabel(period: string): string {
  const { start } = periodBounds(period);
  return start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
