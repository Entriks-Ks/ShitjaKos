import "server-only";
import { endpoint, paramsOf, json } from "@/app/api/v1/_shared/http";
import { readJson, pagination } from "@/app/api/v1/_shared/input";
import { apiActor } from "@/app/api/v1/_shared/access";
import * as searches from "@/services/saved-searches";

export const savedSearchesGet = endpoint(async (r) =>
  searches.getSavedSearches(
    await apiActor(r),
    pagination.parse(Object.fromEntries(new URL(r.url).searchParams)).page,
  ),
);
export const savedSearchesPost = endpoint(async (r) =>
  json(await searches.createSavedSearch(await apiActor(r), await readJson(r)), 201),
);
export const savedSearchPut = endpoint(async (r, c) =>
  searches.updateSavedSearch(
    await apiActor(r),
    (await paramsOf(c)).id,
    await readJson(r),
  ),
);
export const savedSearchDelete = endpoint(async (r, c) =>
  searches.deleteSavedSearch(await apiActor(r), (await paramsOf(c)).id),
);
export const searchAlertRead = endpoint(async (r, c) =>
  searches.markSavedSearchRead(await apiActor(r), (await paramsOf(c)).id),
);
export const searchAlertsRead = endpoint(async (r) =>
  searches.markSavedSearchRead(await apiActor(r)),
);
