import "server-only";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { cities } from "@/lib/catalog";
import { Actor } from "@/lib/permissions";
import { audit } from "./listings";
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
