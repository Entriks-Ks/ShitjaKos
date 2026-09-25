import type { Actor } from "@/lib/permissions";
import { ApiError, checkOrigin } from "./input";

type CurrentActor = Actor & { emailVerified: boolean };
type Dependencies = {
  session: (
    headers: Headers,
    bearer: boolean,
  ) => Promise<{ user: { id: string } } | null>;
  user: (id: string) => Promise<CurrentActor | null>;
  budget: (id: string, write: boolean) => Promise<boolean>;
};

export async function authorizeApiRequest(
  request: Request,
  dependencies: Dependencies,
  admin = false,
) {
  checkOrigin(request);
  const authorization = request.headers.get("authorization");
  const headers = new Headers(request.headers);
  if (authorization !== null) {
    if (!/^Bearer \S{1,2048}$/i.test(authorization))
      throw new ApiError(401, "Invalid authorization.");
    headers.delete("cookie");
  }
  const session = await dependencies.session(headers, authorization !== null);
  if (!session) throw new ApiError(401, "Sign in first.");
  const actor = await dependencies.user(session.user.id);
  if (!actor || actor.suspendedAt || !actor.emailVerified)
    throw new ApiError(403, "Account unavailable.");
  if (admin && actor.role !== "ADMIN") throw new ApiError(403, "Admin access required.");
  if (!(await dependencies.budget(actor.id, !["GET", "HEAD"].includes(request.method)))) {
    throw new ApiError(429, "Too many requests. Try again in a minute.");
  }
  return actor;
}
