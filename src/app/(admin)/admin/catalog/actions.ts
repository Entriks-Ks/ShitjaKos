"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { createCatalogCategory, createCatalogField } from "@/services/admin-catalog";

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
    revalidatePath("/", "layout");
    return { id };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function createFieldAction(raw: unknown) {
  const actor = await requireUser();
  try {
    const id = await createCatalogField(actor, raw);
    revalidatePath("/", "layout");
    return { id };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
