"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import {
  updateProfile,
  changeAccountSecurity,
  deleteOwnAccount,
} from "@/services/profile";
import { APIError } from "better-auth/api";
import { ZodError } from "zod";
import { headers } from "next/headers";

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
        message: error.body?.message ?? "The request failed. Try signing in again.",
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

export async function deleteAccountAction(raw: {
  password: string;
  confirmation: string;
}) {
  try {
    await deleteOwnAccount(new Headers(await headers()), raw);
  } catch (error) {
    if (error instanceof ZodError)
      return { error: "Enter your password and type DELETE to confirm." };
    if (error instanceof APIError)
      return {
        error: "Password verification failed. Check your password or sign in again.",
      };
    const messages = new Set([
      "This account is unavailable.",
      "Sign in again to manage your account.",
      "Staff accounts must be managed by another administrator.",
      "Delete or transfer your shops before deleting your account.",
      "Too many attempts. Wait a minute and try again.",
      "A password is required to delete this account.",
      "Your account changed. Sign in again and retry.",
    ]);
    return {
      error:
        error instanceof Error && messages.has(error.message)
          ? error.message
          : "Could not delete your account. Please try again.",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
