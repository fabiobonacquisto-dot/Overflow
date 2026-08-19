"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ClientStatus, ClientTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recomputeCurrentScore } from "@/lib/scoring-service";

export async function createClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const tier = String(formData.get("tier") ?? "ELITE") as ClientTier;
  const coachId = String(formData.get("coachId") ?? "") || null;

  if (!name || !email) {
    throw new Error("Name and email are required");
  }

  const client = await prisma.client.create({
    data: { name, email, tier, coachId },
  });

  if (coachId) {
    await prisma.coach.update({
      where: { id: coachId },
      data: { currentClientCount: { increment: 1 } },
    });
  }

  await recomputeCurrentScore(client.id);

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClientStatus(clientId: string, status: ClientStatus) {
  await prisma.client.update({ where: { id: clientId }, data: { status } });
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function updateClientDetails(clientId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const tier = String(formData.get("tier") ?? "ELITE") as ClientTier;
  const coachId = String(formData.get("coachId") ?? "") || null;

  if (!name || !email) {
    throw new Error("Name and email are required");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { name, email, tier, coachId },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClient(clientId: string) {
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/clients");
  redirect("/clients");
}
