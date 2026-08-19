import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { periodKey } from "@/lib/scoring";
import { POINTS_BY_ACTIVITY_TYPE } from "@/lib/gauntlet";
import {
  REFERRAL_ELIGIBILITY_SCORE_THRESHOLD,
  REFERRAL_CONVERSION_BONUS_POINTS,
  slugify,
  randomSlugSuffix,
} from "@/lib/referral";

/** Auto-generates a client's referral link the first time their current-period Producer Score crosses the eligibility threshold. */
export async function ensureReferralLinkIfEligible(clientId: string, producerScore: number) {
  if (producerScore < REFERRAL_ELIGIBILITY_SCORE_THRESHOLD) return null;

  const existing = await prisma.referralLink.findUnique({ where: { clientId } });
  if (existing) return existing;

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
  const base = slugify(client?.name ?? "client");

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomSlugSuffix()}`;
    try {
      return await prisma.referralLink.create({ data: { clientId, slug } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }
  return null;
}

/** Backfills links for any active client already over the threshold — self-heals scores computed before this module existed. */
export async function ensureReferralLinksForEligibleClients(period: string = periodKey(new Date())) {
  const scores = await prisma.score.findMany({
    where: { period, producerScore: { gte: REFERRAL_ELIGIBILITY_SCORE_THRESHOLD } },
    select: { clientId: true, producerScore: true },
  });
  await Promise.all(scores.map((s) => ensureReferralLinkIfEligible(s.clientId, s.producerScore)));
}

export async function recordReferralClick(slug: string) {
  return prisma.referralLink
    .update({ where: { slug }, data: { clicks: { increment: 1 } } })
    .catch(() => null);
}

/**
 * Credits a conversion back into Gauntlet points via a real Activity row
 * (rather than writing GauntletEntry.points directly) so the bonus survives
 * every future leaderboard recompute, which derives points purely from
 * Activity — see lib/gauntlet-service.ts. The value is chosen so it yields
 * exactly REFERRAL_CONVERSION_BONUS_POINTS once weighted by
 * POINTS_BY_ACTIVITY_TYPE.REFERRAL_SENT.
 */
export async function recordReferralConversion(referralLinkId: string) {
  const link = await prisma.referralLink.update({
    where: { id: referralLinkId },
    data: { conversions: { increment: 1 }, rewardCredited: true },
  });

  await prisma.activity.create({
    data: {
      clientId: link.clientId,
      type: "REFERRAL_SENT",
      value: REFERRAL_CONVERSION_BONUS_POINTS / POINTS_BY_ACTIVITY_TYPE.REFERRAL_SENT,
      notes: "Referral Flywheel: conversion credit",
    },
  });

  return link;
}
