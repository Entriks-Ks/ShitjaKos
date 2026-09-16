"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { updateProfile } from "@/services/profile";

export async function updateProfileAction(raw: unknown) {
  const actor = await requireUser();
  try {
    await updateProfile(actor, raw);
    revalidatePath("/dashboard", "layout");
    revalidatePath("/listings/[id]", "page");
    return { ok: true };
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? error.issues[0].message
          : "Could not save your profile. Please try again.",
    };
  }
}
