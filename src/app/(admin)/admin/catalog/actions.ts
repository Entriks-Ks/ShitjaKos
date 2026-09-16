"use server";

import { revalidateCatalog } from "@/lib/revalidation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import {
  createCatalogCategory,
  createCatalogField,
  createCatalogFields,
  deleteCatalogCategory,
  deleteCatalogField,
  setCatalogCategoryActive,
} from "@/services/admin-catalog";

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message ?? "Check the form values.";
  if (error instanceof Error && !error.message.includes("prisma")) return error.message;
  return "Could not save this catalog change. Please try again.";
}

export async function createCategoryAction(raw: unknown) {
  const actor = await requireUser();
  try {
    const id = await createCatalogCategory(actor, raw);
    revalidateCatalog();
    return { id };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function createFieldAction(raw: unknown) {
  const actor = await requireUser();
  try {
    const id = await createCatalogField(actor, raw);
    revalidateCatalog();
    return { id };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function createFieldsAction(raw: unknown) {
  const actor = await requireUser();
  try {
    const ids = await createCatalogFields(actor, raw);
    revalidateCatalog();
    return { ids };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function categoryStatusAction(categoryId: string, active: boolean) {
  const actor = await requireUser();
  try {
    await setCatalogCategoryActive(actor, categoryId, active);
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function deleteCategoryAction(categoryId: string) {
  const actor = await requireUser();
  try {
    await deleteCatalogCategory(actor, categoryId);
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function deleteFieldAction(fieldId: string) {
  const actor = await requireUser();
  try {
    await deleteCatalogField(actor, fieldId);
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
