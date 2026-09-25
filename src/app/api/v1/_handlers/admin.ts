import "server-only";
import { z } from "zod";
import { apiActor } from "@/app/api/v1/_shared/access";
import { changeAccountSuspension } from "@/services/admin-accounts";
import { reviewItem } from "@/services/reviews";
import { endpoint, paramsOf, json } from "@/app/api/v1/_shared/http";
import { readJson } from "@/app/api/v1/_shared/input";
import { changed, catalogChanged } from "@/app/api/v1/_shared/cache";
import * as reads from "@/app/api/v1/_shared/reads";
import * as catalog from "@/services/admin-catalog";
const query = (r: Request) => Object.fromEntries(new URL(r.url).searchParams);

export const adminUsersGet = endpoint(async (r) =>
  reads.readAdminAccounts(await apiActor(r, true), "users", query(r)),
);
export const adminBusinessesGet = endpoint(async (r) =>
  reads.readAdminAccounts(await apiActor(r, true), "businesses", query(r)),
);
export const adminReviewsGet = endpoint(async (r) =>
  reads.readAdminQueue(await apiActor(r, true), "reviews", query(r)),
);
export const adminAuditsGet = endpoint(async (r) =>
  reads.readAdminQueue(await apiActor(r, true), "audits", query(r)),
);
export const suspensionPut = (kind: "user" | "business") =>
  endpoint(async (r, c) => {
    const actor = await apiActor(r, true);
    const { id } = await paramsOf(c);
    await changeAccountSuspension(actor, { ...(await readJson(r)), kind, id });
    changed();
  });
export const reviewPut = endpoint(async (r, c) => {
  const actor = await apiActor(r, true);
  const { id } = await paramsOf(c);
  const body = z
    .object({
      decision: z.enum(["APPROVED", "REJECTED"]),
      reason: z.string().trim().min(5).max(1000),
    })
    .parse(await readJson(r));
  await reviewItem(actor, { ...body, kind: "business", id });
  changed();
});
export const adminCatalogGet = endpoint(async (r) =>
  reads.readAdminCatalog(await apiActor(r, true)),
);
export const categoryPost = endpoint(async (r) => {
  const id = await catalog.createCatalogCategory(
    await apiActor(r, true),
    await readJson(r),
  );
  catalogChanged();
  return json({ id }, 201);
});
export const categoryPatch = endpoint(async (r, c) => {
  const actor = await apiActor(r, true);
  const { active } = z.object({ active: z.boolean() }).parse(await readJson(r));
  await catalog.setCatalogCategoryActive(actor, (await paramsOf(c)).id, active);
  catalogChanged();
});
export const categoryDelete = endpoint(async (r, c) => {
  await catalog.deleteCatalogCategory(await apiActor(r, true), (await paramsOf(c)).id);
  catalogChanged();
});
export const fieldsPost = endpoint(async (r, c) => {
  const actor = await apiActor(r, true);
  const { id } = await paramsOf(c);
  const ids = await catalog.createCatalogFields(actor, {
    ...(await readJson(r)),
    categoryId: id,
  });
  catalogChanged();
  return json({ ids }, 201);
});
export const fieldDelete = endpoint(async (r, c) => {
  await catalog.deleteCatalogField(await apiActor(r, true), (await paramsOf(c)).id);
  catalogChanged();
});
