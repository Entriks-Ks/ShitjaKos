import "server-only";
import { getAuth } from "@/lib/auth";
import { getV1Auth } from "./mobile-session";
import { authorizeApiRequest } from "@/app/api/v1/_shared/authorization";
import { consumeApiBudget, findApiUser } from "@/app/api/v1/_shared/budget";

export async function apiActor(request: Request, admin = false) {
  return authorizeApiRequest(
    request,
    {
      session: (headers, bearer) =>
        bearer
          ? getV1Auth().api.getSession({ headers })
          : getAuth().api.getSession({ headers }),
      user: findApiUser,
      budget: consumeApiBudget,
    },
    admin,
  );
}
