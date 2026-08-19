import { NextRequest, NextResponse } from "next/server";
import { recordReferralClick } from "@/lib/referral-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  await recordReferralClick(params.slug);
  return NextResponse.redirect(new URL(`/?ref=${params.slug}`, request.url));
}
