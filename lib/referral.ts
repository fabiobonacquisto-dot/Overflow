/**
 * Referral Flywheel — thresholds/config. Placeholder eligibility score and
 * conversion bonus, pending real calibration alongside the other Ledger
 * thresholds (Master Brief Part 9) — same pattern as CATEGORY_TARGETS in
 * lib/scoring.ts and REWARD_TIERS in lib/gauntlet.ts.
 */

export const REFERRAL_ELIGIBILITY_SCORE_THRESHOLD = 70;
export const REFERRAL_CONVERSION_BONUS_POINTS = 50;

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "client";
}

export function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
