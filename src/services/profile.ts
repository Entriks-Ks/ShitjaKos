import "server-only";
import { Actor } from "@/lib/permissions";
import { profileInput } from "@/lib/validations/profile";
import { recordAudit } from "@/repositories/audit";
import { withTransaction } from "@/repositories/transaction";
import { findUserStatus, renameUser, upsertPersonalProfile } from "@/repositories/users";

export async function updateProfile(actor: Actor, raw: unknown) {
  if (actor.suspendedAt) throw new Error("This account is suspended.");
  const { name, ...profile } = profileInput.parse(raw);
  return withTransaction(async (tx) => {
    const user = await findUserStatus(tx, actor.id);
    if (!user || user.suspendedAt) throw new Error("Your account is unavailable.");
    await renameUser(tx, actor.id, name);
    await upsertPersonalProfile(tx, actor.id, profile);
    await recordAudit(tx, actor.id, "profile.updated", actor.id, {
      fields: ["name", "displayName", "city", "bio", "phone"],
    });
  });
}
