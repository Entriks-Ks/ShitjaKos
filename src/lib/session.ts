import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { findActorById, findUserWithMemberships } from "@/repositories/users";
const getSession = cache(async () => {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null;
  return getAuth().api.getSession({ headers: await headers() });
});

// Public pages only need identity/permissions, not every shop membership.
export const currentActor = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await findActorById(session.user.id);
  return user && !user.suspendedAt ? user : null;
});
// React cache shares this work only within the current server render/request.
// Account roles and suspensions are still read afresh on subsequent requests.
export const currentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await findUserWithMemberships(session.user.id);
  return user && !user.suspendedAt ? user : null;
});
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
