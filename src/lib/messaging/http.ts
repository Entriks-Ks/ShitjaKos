import "server-only";
import { z } from "zod";
import { ChatError } from "@/lib/messaging/policy";

export function chatJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
export function chatHttpError(error: unknown) {
  if (error instanceof z.ZodError) return chatJson({ error: "Invalid request." }, 400);
  if (error instanceof ChatError) return chatJson({ error: error.message }, error.status);
  console.error(
    "Messaging read failed.",
    error instanceof Error ? error.name : "UnknownError",
  );
  return chatJson({ error: "Messages could not be loaded." }, 500);
}
