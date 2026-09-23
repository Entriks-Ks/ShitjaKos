import "server-only";

import { z } from "zod";
import type { Actor } from "@/lib/permissions";
import { recordAudit } from "@/repositories/audit";
import { withTransaction } from "@/repositories/transaction";
import {
  findModerationUser,
  findModerationBusiness,
  updateUserSuspension,
  updateBusinessSuspension,
} from "@/repositories/admin-accounts";

const suspensionInput = z.object({
  kind: z.enum(["user", "business"]),
  id: z.string().min(1).max(100),
  suspended: z.boolean(),
  reason: z.string().trim().min(5).max(1000),
});

export async function changeAccountSuspension(actor: Actor, raw: unknown) {
  const input = suspensionInput.parse(raw);

  return withTransaction(async (tx) => {
    const admin = await findModerationUser(tx, actor.id);
    if (!admin || admin.role !== "ADMIN" || admin.suspendedAt) {
      throw new Error("Only an active admin can perform this action.");
    }

    if (input.kind === "user") {
      const target = await findModerationUser(tx, input.id);
      if (!target) throw new Error("User not found.");
      if (target.id === admin.id) {
        throw new Error("You cannot suspend or restore your own account.");
      }
      if (target.role === "ADMIN") {
        throw new Error("Admin accounts are protected on this screen.");
      }
      if (Boolean(target.suspendedAt) === input.suspended) return;

      await updateUserSuspension(tx, target.id, input.suspended);
    } else {
      const target = await findModerationBusiness(tx, input.id);
      if (!target) throw new Error("Business not found.");
      if (Boolean(target.suspendedAt) === input.suspended) return;

      await updateBusinessSuspension(tx, target.id, input.suspended);
    }

    await recordAudit(
      tx,
      admin.id,
      `${input.kind}.${input.suspended ? "suspended" : "restored"}`,
      input.id,
      { reason: input.reason },
    );
  });
}
