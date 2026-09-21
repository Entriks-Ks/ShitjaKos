import "server-only";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { cities } from "@/lib/catalog";
import { Actor, assertBusinessDeletionAllowed } from "@/lib/permissions";
import { audit } from "./listings";
import {
  getBusinessDeletionContext,
  removeEmptyBusiness,
} from "@/repositories/businesses";

export async function deleteBusiness(actor: Actor, businessId: string) {
  return getPrisma().$transaction(async (tx) => {
    const membership = await getBusinessDeletionContext(tx, businessId, actor.id);
    assertBusinessDeletionAllowed(
      membership?.user ?? actor,
      membership,
      membership?.business._count.listings ?? 0,
    );
    await removeEmptyBusiness(tx, businessId);
    await audit(tx, actor.id, "business.deleted", businessId, {
      publicName: membership!.business.publicName,
    });
  });
}

const input = z.object({
  legalName: z.string().trim().min(3).max(150),
  publicName: z.string().trim().min(3).max(100),
  city: z.enum(cities),
  phone: z.string().regex(/^\+?[\d\s()-]{7,25}$/),
  email: z.email(),
  description: z.string().trim().min(20).max(2000),
  address: z.string().max(200),
  openingHours: z.string().max(300),
});

export async function createBusiness(actor: Actor, raw: unknown) {
  const v = input.parse(raw);
  if (actor.suspendedAt) throw new Error("Account suspended.");
  return getPrisma().$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!user.emailVerified || user.suspendedAt)
      throw new Error("An active, verified account is required.");
    const { address, openingHours, ...data } = v;
    const slug = `${
      v.publicName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || "shop"
    }-${randomBytes(3).toString("hex")}`;
    const business = await tx.business.create({
      data: {
        ...data,
        memberships: { create: { userId: actor.id, role: "OWNER" } },
        shop: { create: { slug, address, openingHours } },
      },
    });
    await audit(tx, actor.id, "business.submitted", business.id, {});
    return business.id;
  });
}

export async function updateBusiness(actor: Actor, businessId: string, raw: unknown) {
  const v = input.partial().parse(raw);
  if (actor.suspendedAt) throw new Error("Account suspended.");
  return getPrisma().$transaction(async (tx) => {
    const business = await tx.business.findUniqueOrThrow({
      where: { id: businessId },
      include: { memberships: true },
    });
    const membership = business.memberships.find((m) => m.userId === actor.id);
    if (!membership || membership.role !== "OWNER")
      throw new Error("Not authorized to update this business.");
    const { address, openingHours, ...data } = v;
    await tx.business.update({
      where: { id: businessId },
      data: {
        ...data,
        shop:
          address !== undefined || openingHours !== undefined
            ? { update: { address, openingHours } }
            : undefined,
      },
    });
    await audit(tx, actor.id, "business.updated", businessId, {});
  });
}
