import { PrismaClient, Prisma, ActivityType, ClientTier, ClientStatus } from "@prisma/client";
import { computeProducerScore, periodKey, previousPeriod, periodBounds } from "../lib/scoring";

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

const COACHES = [
  { name: "Jordan Blake", email: "jordan.blake@southwesternconsulting.com" },
  { name: "Morgan Reyes", email: "morgan.reyes@southwesternconsulting.com" },
  { name: "Casey Lin", email: "casey.lin@southwesternconsulting.com" },
];

const CLIENTS: Array<{
  name: string;
  email: string;
  tier: ClientTier;
  status: ClientStatus;
  joinedDaysAgo: number;
  activityLevel: "high" | "mid" | "low";
}> = [
  { name: "Avery Whitfield", email: "avery.whitfield@example.com", tier: "FOUNDERS", status: "ACTIVE", joinedDaysAgo: 420, activityLevel: "high" },
  { name: "Priya Nandakumar", email: "priya.nandakumar@example.com", tier: "ELITE", status: "ACTIVE", joinedDaysAgo: 310, activityLevel: "high" },
  { name: "Diego Alcantara", email: "diego.alcantara@example.com", tier: "ELITE", status: "ACTIVE", joinedDaysAgo: 260, activityLevel: "mid" },
  { name: "Simone Bergeron", email: "simone.bergeron@example.com", tier: "FOUNDERS", status: "ACTIVE", joinedDaysAgo: 500, activityLevel: "high" },
  { name: "Malik Osei", email: "malik.osei@example.com", tier: "ELITE", status: "ACTIVE", joinedDaysAgo: 190, activityLevel: "mid" },
  { name: "Hannah Fitzgerald", email: "hannah.fitzgerald@example.com", tier: "ELITE", status: "ACTIVE", joinedDaysAgo: 150, activityLevel: "low" },
  { name: "Ricardo Montez", email: "ricardo.montez@example.com", tier: "ELITE", status: "PAUSED", joinedDaysAgo: 340, activityLevel: "low" },
  { name: "Naomi Tanaka", email: "naomi.tanaka@example.com", tier: "ELITE", status: "ACTIVE", joinedDaysAgo: 95, activityLevel: "mid" },
  { name: "Lucas Ferreira", email: "lucas.ferreira@example.com", tier: "ELITE", status: "ACTIVE", joinedDaysAgo: 220, activityLevel: "high" },
];

const ACTIVITY_LEVEL_MULTIPLIER: Record<string, number> = {
  high: 1.4,
  mid: 1.0,
  low: 0.55,
};

const MONTHLY_ACTIVITY_MIX: Array<{ type: ActivityType; count: number }> = [
  { type: "PLANNING", count: 3 },
  { type: "CHECK_IN", count: 4 },
  { type: "PROSPECTING", count: 18 },
  { type: "REFERRAL_SENT", count: 3 },
  { type: "CLOSE", count: 3 },
  { type: "CALL", count: 4 },
  { type: "FOLLOW_UP", count: 5 },
  { type: "TRAINING", count: 2 },
];

const WIN_TEMPLATES = [
  { description: "Closed largest deal of the quarter after a 3-call sequence", metricImproved: "Average deal size", percentGain: 42, isAdReady: true },
  { description: "Rebuilt morning prospecting block, doubled outbound calls", metricImproved: "Daily prospecting calls", percentGain: 96, isAdReady: true },
  { description: "Referral from a past client converted within 48 hours", metricImproved: "Referral conversion rate", percentGain: 30, isAdReady: false },
  { description: "Cut no-show rate on discovery calls with a new confirmation flow", metricImproved: "Call show-up rate", percentGain: 25, isAdReady: false },
  { description: "Hit a personal-best close rate three months running", metricImproved: "Close rate", percentGain: 18, isAdReady: true },
  { description: "Turned a stalled account around after a coach-prep call", metricImproved: "Account retention", percentGain: 60, isAdReady: false },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinPeriod(period: string): Date {
  const { start, end } = periodBounds(period);
  const startMs = start.getTime();
  const endMs = Math.min(end.getTime(), Date.now());
  return new Date(startMs + Math.random() * Math.max(1, endMs - startMs));
}

async function main() {
  const existingClientCount = await prisma.client.count();
  if (existingClientCount > 0 && process.env.SEED_FORCE !== "true") {
    console.log(
      `Ledger already has ${existingClientCount} client(s) — skipping seed. ` +
        "Run with SEED_FORCE=true to reset and reseed mock data (this deletes existing data)."
    );
    return;
  }

  console.log("Clearing existing Ledger data...");
  await prisma.score.deleteMany();
  await prisma.gauntletEntry.deleteMany();
  await prisma.referralLink.deleteMany();
  await prisma.foundersCircleInvite.deleteMany();
  await prisma.win.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.client.deleteMany();
  await prisma.coach.deleteMany();

  console.log("Seeding coaches...");
  const coaches = [];
  for (const coach of COACHES) {
    coaches.push(
      await prisma.coach.create({
        data: { ...coach, clientCapacity: 15 },
      })
    );
  }

  const now = new Date();
  const currentPeriodKey = periodKey(now);
  const priorPeriodKey = previousPeriod(currentPeriodKey);

  console.log("Seeding clients, activities, and wins...");
  for (let i = 0; i < CLIENTS.length; i++) {
    const c = CLIENTS[i];
    const coach = coaches[i % coaches.length];

    const client = await prisma.client.create({
      data: {
        name: c.name,
        email: c.email,
        tier: c.tier,
        status: c.status,
        coachId: coach.id,
        joinedAt: new Date(now.getTime() - c.joinedDaysAgo * DAY_MS),
      },
    });

    const multiplier = ACTIVITY_LEVEL_MULTIPLIER[c.activityLevel];

    for (const period of [priorPeriodKey, currentPeriodKey]) {
      for (const mix of MONTHLY_ACTIVITY_MIX) {
        const count = Math.round(mix.count * multiplier * (0.75 + Math.random() * 0.5));
        for (let n = 0; n < count; n++) {
          await prisma.activity.create({
            data: {
              clientId: client.id,
              type: mix.type,
              value: 1,
              occurredAt: randomDateWithinPeriod(period),
            },
          });
        }
      }
    }

    const winCount = randomInt(1, 3);
    const usedTemplates = new Set<number>();
    for (let w = 0; w < winCount; w++) {
      let templateIndex = randomInt(0, WIN_TEMPLATES.length - 1);
      while (usedTemplates.has(templateIndex) && usedTemplates.size < WIN_TEMPLATES.length) {
        templateIndex = randomInt(0, WIN_TEMPLATES.length - 1);
      }
      usedTemplates.add(templateIndex);
      const template = WIN_TEMPLATES[templateIndex];
      await prisma.win.create({
        data: {
          clientId: client.id,
          description: template.description,
          metricImproved: template.metricImproved,
          percentGain: template.percentGain,
          isAdReady: template.isAdReady,
          occurredAt: randomDateWithinPeriod(currentPeriodKey),
        },
      });
    }

    await prisma.coach.update({
      where: { id: coach.id },
      data: { currentClientCount: { increment: 1 } },
    });
  }

  console.log("Computing Producer Scores...");
  const clients = await prisma.client.findMany();
  for (const client of clients) {
    for (const period of [priorPeriodKey, currentPeriodKey]) {
      const { start, end } = periodBounds(period);
      const activities = await prisma.activity.findMany({
        where: { clientId: client.id, occurredAt: { gte: start, lt: end } },
        select: { type: true, value: true },
      });
      const { producerScore, categoryBreakdown } = computeProducerScore(activities);
      await prisma.score.create({
        data: {
          clientId: client.id,
          period,
          producerScore,
          categoryBreakdown: categoryBreakdown as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  console.log(`Seeded ${clients.length} clients across ${coaches.length} coaches.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
