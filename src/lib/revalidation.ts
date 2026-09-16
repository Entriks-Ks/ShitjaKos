import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog-cache";

export function revalidateListing(id: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/listings/${id}`);
  revalidatePath(`/listings/${id}/edit`);
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/shops/[slug]", "page");
}

export function revalidateCatalog() {
  updateTag(CATALOG_TAG);
  revalidatePath("/admin/catalog");
}

export function revalidateBusiness() {
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/shops");
  revalidatePath("/listings/new");
  revalidatePath("/shops");
  revalidatePath("/shops/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/search");
}
