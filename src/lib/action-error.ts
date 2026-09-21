import "server-only";
import { z } from "zod";

export function actionErrorMessage(error: unknown) {
  return error instanceof z.ZodError
    ? error.issues[0].message
    : error instanceof Error && !error.message.includes("prisma")
      ? error.message
      : "We could not save this change. Please try again.";
}
