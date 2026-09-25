import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog-cache";
export function changed() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/listings/[id]", "page");
  revalidatePath("/shops/[slug]", "page");
  revalidatePath("/search");
  revalidatePath("/");
}
export function catalogChanged() {
  revalidateTag(CATALOG_TAG, { expire: 0 });
  revalidatePath("/admin/catalog");
  changed();
}
