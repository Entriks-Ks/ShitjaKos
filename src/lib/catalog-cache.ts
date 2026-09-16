import "server-only";
import { unstable_cache } from "next/cache";
import { createHash } from "node:crypto";
import { getCategories } from "@/repositories/catalog";

export const CATALOG_TAG = "public-catalog";

// This app uses the classic Next cache model (Cache Components are not enabled).
// Keep raw repository reads available for writes/tests; cache only public UI data.
const databaseKey = createHash("sha256")
  .update(process.env.DATABASE_URL ?? "")
  .digest("hex");
export const getCachedCategories = unstable_cache(
  getCategories,
  ["public-catalog-v1", databaseKey],
  {
    tags: [CATALOG_TAG],
    revalidate: 300,
  },
);
