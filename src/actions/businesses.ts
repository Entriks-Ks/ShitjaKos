"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { actionErrorMessage } from "@/lib/action-error";
import {
  createBusinessWithImages,
  updateBusiness,
  deleteBusiness,
} from "@/services/businesses";
import {
  clearShopImage,
  parseShopImageKind,
  saveShopImage,
} from "@/services/shop-images";
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
    const form = raw instanceof FormData ? raw : null;
    const values = form ? Object.fromEntries(form) : raw;
    const result = await createBusinessWithImages(user, values, {
      logo: form?.get("logo"),
      background: form?.get("background"),
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/shops");
    return result;
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

export async function saveShopImageAction(
  businessId: string,
  kind: string,
  formData: FormData,
) {
  const user = await requireUser();
  try {
    const id = z.string().min(1).max(100).parse(businessId);
    await saveShopImage(user, id, parseShopImageKind(kind), formData.get("file"));
    revalidateBusiness();
    revalidatePath(`/business/${id}/edit`);
    return { ok: true };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function clearShopImageAction(businessId: string, kind: string) {
  const user = await requireUser();
  try {
    const id = z.string().min(1).max(100).parse(businessId);
    await clearShopImage(user, id, parseShopImageKind(kind));
    revalidateBusiness();
    revalidatePath(`/business/${id}/edit`);
    return { ok: true };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}
