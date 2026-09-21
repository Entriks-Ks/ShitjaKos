"use server";

import { z } from "zod";
import { revalidateBusiness } from "@/lib/revalidation";
import { requireUser } from "@/lib/session";
import { reviewItem } from "@/services/reviews";

export async function reviewAction(form: FormData) {
  const user = await requireUser();
  const id = z.string().min(1).parse(form.get("id"));
  const kind = z.literal("business").parse(form.get("kind"));
  const decision = z.enum(["APPROVED", "REJECTED"]).parse(form.get("decision"));
  const reason = z.string().trim().min(5).max(1000).parse(form.get("reason"));
  await reviewItem(user, { id, kind, decision, reason });
  revalidateBusiness();
}
