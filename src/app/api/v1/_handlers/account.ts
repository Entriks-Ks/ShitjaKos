import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { apiActor } from "@/app/api/v1/_shared/access";
import { updateProfile } from "@/services/profile";
import { setFavorite } from "@/services/favorites";
import { endpoint, paramsOf } from "@/app/api/v1/_shared/http";
import { readJson } from "@/app/api/v1/_shared/input";
import { changed } from "@/app/api/v1/_shared/cache";
import * as reads from "@/app/api/v1/_shared/reads";
const query = (r: Request) => Object.fromEntries(new URL(r.url).searchParams);

export const profileGet = endpoint(async (r) => reads.readProfile(await apiActor(r)));
export const profilePut = endpoint(async (r) => {
  await updateProfile(await apiActor(r), await readJson(r));
  changed();
});
export const myListingsGet = endpoint(async (r) =>
  reads.readMyListings(await apiActor(r), query(r)),
);
export const favoritesGet = endpoint(async (r) =>
  reads.readFavorites(await apiActor(r), query(r)),
);
export const favoritePut = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id } = await paramsOf(c);
  const { saved } = z.object({ saved: z.boolean() }).parse(await readJson(r));
  await setFavorite(actor, id, saved);
  revalidatePath("/dashboard/favorites");
  return { saved };
});
