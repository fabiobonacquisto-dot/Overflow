"use server";

import { revalidatePath } from "next/cache";
import { ActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recomputeCurrentScore } from "@/lib/scoring-service";

export async function logActivity(clientId: string, formData: FormData) {
  const type = String(formData.get("type") ?? "") as ActivityType;
  const valueRaw = String(formData.get("value") ?? "1");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const occurredAtRaw = String(formData.get("occurredAt") ?? "");

  const value = Number.parseFloat(valueRaw);

  await prisma.activity.create({
    data: {
      clientId,
      type,
      value: Number.isFinite(value) && value > 0 ? value : 1,
      notes,
      occurredAt: occurredAtRaw ? new Date(occurredAtRaw) : new Date(),
    },
  });

  await recomputeCurrentScore(clientId);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function deleteActivity(activityId: string, clientId: string) {
  await prisma.activity.delete({ where: { id: activityId } });
  await recomputeCurrentScore(clientId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function logWin(clientId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const metricImproved = String(formData.get("metricImproved") ?? "").trim();
  const percentGainRaw = String(formData.get("percentGain") ?? "0");
  const isAdReady = formData.get("isAdReady") === "on";

  if (!description || !metricImproved) {
    throw new Error("Description and metric improved are required");
  }

  await prisma.win.create({
    data: {
      clientId,
      description,
      metricImproved,
      percentGain: Number.parseFloat(percentGainRaw) || 0,
      isAdReady,
    },
  });

  revalidatePath(`/clients/${clientId}`);
}

export async function deleteWin(winId: string, clientId: string) {
  await prisma.win.delete({ where: { id: winId } });
  revalidatePath(`/clients/${clientId}`);
}

export async function toggleWinAdReady(winId: string, clientId: string, isAdReady: boolean) {
  await prisma.win.update({ where: { id: winId }, data: { isAdReady } });
  revalidatePath(`/clients/${clientId}`);
}

export async function recomputeScoreAction(clientId: string) {
  await recomputeCurrentScore(clientId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}
