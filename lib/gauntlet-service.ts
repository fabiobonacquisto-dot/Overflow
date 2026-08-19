import { prisma } from "@/lib/prisma";
import { periodBoundsFor, type PeriodType } from "@/lib/periods";
import { computeGauntletPoints, rewardTierFor } from "@/lib/gauntlet";

export async function recomputeGauntletForPeriod(period: string, periodType: PeriodType) {
  const { start, end } = periodBoundsFor(period, periodType);

  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  const ranked = await Promise.all(
    clients.map(async ({ id: clientId }) => {
      const activities = await prisma.activity.findMany({
        where: { clientId, occurredAt: { gte: start, lt: end } },
        select: { type: true, value: true },
      });
      return { clientId, points: computeGauntletPoints(activities) };
    })
  );

  ranked.sort((a, b) => b.points - a.points);

  await Promise.all(
    ranked.map(({ clientId, points }, index) => {
      const tier = rewardTierFor(points);
      return prisma.gauntletEntry.upsert({
        where: { clientId_period: { clientId, period } },
        create: { clientId, period, points, tierRank: index + 1, tripEarned: tier?.tripEarned ?? false },
        update: { points, tierRank: index + 1, tripEarned: tier?.tripEarned ?? false },
      });
    })
  );
}
