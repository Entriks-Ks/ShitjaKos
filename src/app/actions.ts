"use server";
import { revalidatePath } from "next/cache";
import { revalidateBusiness, revalidateListing } from "@/lib/revalidation";
import { requireUser } from "@/lib/session";
import { saveListing, transitionListing } from "@/services/listings";
import { createBusiness } from "@/services/businesses";
import { reviewItem } from "@/services/reviews";
import { z } from "zod";
function message(e: unknown) {
  return e instanceof z.ZodError
    ? e.issues[0].message
    : e instanceof Error && !e.message.includes("prisma")
      ? e.message
      : "We could not save this change. Please try again.";
}
export async function saveListingAction(raw: unknown) {
  const user = await requireUser();
  try {
    const id = await saveListing(user, raw);
    revalidateListing(id);
    return { id };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function businessAction(raw: unknown) {
  const user = await requireUser();
  try {
    const id = await createBusiness(user, raw);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/shops");
    return { id };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function statusAction(
  id: string,
  target: "PUBLISHED" | "PAUSED" | "SOLD" | "CLOSED",
) {
  const user = await requireUser();
  try {
    await transitionListing(user, id, target);
    revalidateListing(id);
    return { ok: true };
  } catch (e) {
    return { error: message(e) };
  }
}
export async function reviewAction(form: FormData) {
  const user = await requireUser();
  const id = z.string().min(1).parse(form.get("id"));
  const kind = z.literal("business").parse(form.get("kind"));
  const decision = z.enum(["APPROVED", "REJECTED"]).parse(form.get("decision"));
  const reason = z.string().trim().min(5).max(1000).parse(form.get("reason"));
  await reviewItem(user, { id, kind, decision, reason });
  revalidateBusiness();
}
