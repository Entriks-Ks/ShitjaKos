"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { actionErrorMessage } from "@/lib/action-error";
import { createBusiness, updateBusiness, deleteBusiness } from "@/services/businesses";
import { revalidateBusiness } from "@/lib/revalidation";
import { z } from "zod";

export async function deleteBusinessAction(businessId: string) {
  const user = await requireUser();
  try {
    const id = z.string().min(1).max(100).parse(businessId);
    await deleteBusiness(user, id);
    revalidateBusiness();
    revalidatePath(`/business/${id}/edit`);
    return { ok: true };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function businessAction(raw: unknown) {
  const user = await requireUser();
  try {
    const id = await createBusiness(user, raw);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/shops");
    return { id };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function updateBusinessAction(businessId: string, raw: unknown) {
  const user = await requireUser();
  try {
    const id = z.string().min(1).max(100).parse(businessId);
    await updateBusiness(user, id, raw);
    revalidateBusiness();
    revalidatePath(`/business/${id}/edit`);
    return { ok: true };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}
