import "server-only";
import { z } from "zod";
import { ApiError, apiId } from "./input";
import { ChatError } from "@/lib/messaging/policy";
import { MediaOperationError } from "@/services/media";
import { BusinessStaffError } from "@/services/business-staff";
import { serviceErrorStatus } from "./service-errors";

export type ApiContext = { params: Promise<Record<string, string>> };
export async function paramsOf(context: ApiContext) {
  const params = await context.params;
  for (const value of Object.values(params)) apiId.parse(value);
  return params;
}
export function json(data: unknown, status = 200) {
  return Response.json(data ?? { ok: true }, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Authorization",
      "X-Content-Type-Options": "nosniff",
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
}
export function endpoint(
  handler: (request: Request, context: ApiContext) => Promise<unknown>,
) {
  return async (request: Request, context: ApiContext) => {
    try {
      const result = await handler(request, context);
      return result instanceof Response ? result : json(result);
    } catch (error) {
      if (error instanceof z.ZodError)
        return json(
          {
            error: "Invalid request.",
            issues: error.issues.map((i) => ({ path: i.path, message: i.message })),
          },
          400,
        );
      if (
        error instanceof ApiError ||
        error instanceof ChatError ||
        error instanceof MediaOperationError
      )
        return json({ error: error.message }, error.status);
      if (error instanceof BusinessStaffError) return json({ error: error.message }, 403);
      const knownStatus = serviceErrorStatus(error);
      if (knownStatus)
        return json(
          {
            error:
              knownStatus === 422
                ? "The operation's requirements are not met. Check the submitted values."
                : knownStatus === 409
                  ? "Conflicting change. Refresh and retry."
                  : knownStatus === 404
                    ? "Not found."
                    : "Not authorized.",
          },
          knownStatus,
        );
      const code =
        error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code === "P2025") return json({ error: "Not found." }, 404);
      if (code === "P2002" || code === "P2003" || code === "P2034")
        return json({ error: "Conflicting change. Refresh and retry." }, 409);
      console.error(
        "API request failed",
        error instanceof Error ? error.name : "UnknownError",
      );
      return json({ error: "Request failed. Please try again." }, 500);
    }
  };
}
