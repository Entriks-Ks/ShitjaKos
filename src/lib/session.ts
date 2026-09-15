import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { getPrisma } from "./prisma";
export async function currentUser() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      memberships: { include: { business: { include: { shop: true } } } },
    },
  });
  return user && !user.suspendedAt ? user : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
