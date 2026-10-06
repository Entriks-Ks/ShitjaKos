"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { updateProfile, changeAccountSecurity } from "@/services/profile";
import { APIError } from "better-auth/api";
import { ZodError } from "zod";
import { headers } from "next/headers";
import Link from "next/link";

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


export async function accountSecurityAction(
  _previous: { ok: boolean; message: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  try {
    const message = await changeAccountSecurity(
      new Headers(await headers()),
      Object.fromEntries(formData.entries()),
    );

    revalidatePath("/dashboard/security");
    revalidatePath("/dashboard/profile");

    return {
      ok: true,
      message,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        message:
          "Check your input. Passwords need at least 12 characters, " +
          "and verification codes must contain six digits.",
      };
    }

    if (error instanceof APIError) {
      return {
        ok: false,
        message:
          error.body?.message ??
          "The request failed. Try signing in again.",
      };
    }

    // Only expose known application errors, not database errors.
    const safeMessages = new Set([
      "Sign in again to manage your account.",
      "This account is unavailable.",
      "Too many attempts. Wait a minute and try again.",
      "The new passwords do not match.",
      "Use the normal sign-out button for your current session.",
    ]);

    return {
      ok: false,
      message:
        error instanceof Error && safeMessages.has(error.message)
          ? error.message
          : "Could not complete the request. Please try again.",
    };
  }
}
