import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeProducerScore, periodBounds, periodKey, type ProducerScoreResult } from "@/lib/scoring";
import { ensureReferralLinkIfEligible } from "@/lib/referral-service";

export async function recomputeScoreForPeriod(clientId: string, period: string) {
  const { start, end } = periodBounds(period);

  const activities = await prisma.activity.findMany({
    where: { clientId, occurredAt: { gte: start, lt: end } },
    select: { type: true, value: true },
  });

  const result = computeProducerScore(activities);

  const score = await prisma.score.upsert({
    where: { clientId_period: { clientId, period } },
    create: {
      clientId,
      period,
      producerScore: result.producerScore,
      categoryBreakdown: result.categoryBreakdown as unknown as Prisma.InputJsonValue,
    },
    update: {
      producerScore: result.producerScore,
      categoryBreakdown: result.categoryBreakdown as unknown as Prisma.InputJsonValue,
      computedAt: new Date(),
    },
  });

  // Referral Flywheel: auto-generate a link the moment a client crosses the eligibility score.
  await ensureReferralLinkIfEligible(clientId, result.producerScore);

  return score;
}

export async function recomputeCurrentScore(clientId: string) {
  return recomputeScoreForPeriod(clientId, periodKey(new Date()));
}

export type { ProducerScoreResult };
