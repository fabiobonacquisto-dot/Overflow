"use server";

import { revalidatePath } from "next/cache";
import { recordReferralConversion } from "@/lib/referral-service";

export async function simulateConversion(referralLinkId: string) {
  await recordReferralConversion(referralLinkId);
  revalidatePath("/referrals");
  revalidatePath("/gauntlet");
}
