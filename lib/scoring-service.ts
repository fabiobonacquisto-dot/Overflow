import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeProducerScore, periodBounds, periodKey, type ProducerScoreResult } from "@/lib/scoring";

export async function recomputeScoreForPeriod(clientId: string, period: string) {
  const { start, end } = periodBounds(period);

  const activities = await prisma.activity.findMany({
    where: { clientId, occurredAt: { gte: start, lt: end } },
    select: { type: true, value: true },
  });

  const result = computeProducerScore(activities);

  return prisma.score.upsert({
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
}

export async function recomputeCurrentScore(clientId: string) {
  return recomputeScoreForPeriod(clientId, periodKey(new Date()));
}

export type { ProducerScoreResult };
