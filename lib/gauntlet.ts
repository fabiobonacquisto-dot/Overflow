import { ActivityType } from "@prisma/client";

/**
 * The Gauntlet — a trip-based competition layered on top of Ledger activity
 * data. Points reward volume/impact (closes worth far more than a single
 * prospecting touch) rather than the balanced-category logic Producer Score
 * uses, so the two systems can disagree on who's "winning" by design.
 *
 * Point values and reward tiers are placeholders pending the leadership
 * decision on the first real Gauntlet trip threshold/reward (Master Brief
 * Part 9) — swap the numbers below once that's settled, no schema changes
 * needed.
 */

export const POINTS_BY_ACTIVITY_TYPE: Record<ActivityType, number> = {
  CLOSE: 25,
  REFERRAL_SENT: 10,
  CALL: 5,
  TRAINING: 3,
  FOLLOW_UP: 3,
  PROSPECTING: 2,
  CHECK_IN: 2,
  PLANNING: 2,
};

export interface GauntletActivity {
  type: ActivityType;
  value: number;
}

export function computeGauntletPoints(activities: GauntletActivity[]): number {
  return Math.round(
    activities.reduce((sum, activity) => sum + POINTS_BY_ACTIVITY_TYPE[activity.type] * activity.value, 0)
  );
}

export interface RewardTier {
  name: string;
  minPoints: number;
  reward: string;
  tripEarned: boolean;
}

/**
 * Ordered highest-threshold first — tiered, not winner-take-all. Calibrated
 * against seeded mock volume (~110-280 pts/month across activity levels) so
 * the top tier stays a genuine stretch rather than something most active
 * clients clear by default — re-tune once real monthly volume is known.
 */
export const REWARD_TIERS: RewardTier[] = [
  { name: "Trip Winner", minPoints: 260, reward: "All-expenses Gauntlet trip", tripEarned: true },
  { name: "Gold", minPoints: 200, reward: "$500 bonus + Gold pin", tripEarned: false },
  { name: "Silver", minPoints: 120, reward: "$250 bonus + Silver pin", tripEarned: false },
  { name: "Bronze", minPoints: 50, reward: "$100 bonus + Bronze pin", tripEarned: false },
];

export const TRIP_POINTS_THRESHOLD = REWARD_TIERS.find((t) => t.tripEarned)?.minPoints ?? Infinity;

export function rewardTierFor(points: number): RewardTier | null {
  return REWARD_TIERS.find((tier) => points >= tier.minPoints) ?? null;
}
