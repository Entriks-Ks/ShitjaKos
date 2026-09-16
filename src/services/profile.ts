import "server-only";
import { getPrisma } from "@/lib/prisma";
import { Actor } from "@/lib/permissions";
import { profileInput } from "@/lib/validations/profile";

export async function updateProfile(actor: Actor, raw: unknown) {
  if (actor.suspendedAt) throw new Error("This account is suspended.");
  const { name, ...profile } = profileInput.parse(raw);
  return getPrisma().$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: actor.id },
      select: { suspendedAt: true },
    });
    if (!user || user.suspendedAt) throw new Error("Your account is unavailable.");
    await tx.user.update({ where: { id: actor.id }, data: { name } });
    await tx.personalProfile.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id, ...profile },
      update: profile,
    });
    await tx.auditEvent.create({
      data: {
        actorId: actor.id,
        action: "profile.updated",
        targetId: actor.id,
        detail: { fields: ["name", "displayName", "city", "bio", "phone"] },
      },
    });
  });
}
