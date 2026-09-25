import "server-only";
import { z } from "zod";
import { apiActor } from "@/app/api/v1/_shared/access";
import { saveListing, transitionListing, deleteListing } from "@/services/listings";
import { addListingPhoto, deleteListingPhoto } from "@/services/media";
import { getListingPhotoResponse } from "@/services/media-delivery";
import { endpoint, paramsOf, json } from "@/app/api/v1/_shared/http";
import { readJson, boundedBytes, ApiError } from "@/app/api/v1/_shared/input";
import { changed } from "@/app/api/v1/_shared/cache";
import * as reads from "@/app/api/v1/_shared/reads";
const query = (r: Request) => Object.fromEntries(new URL(r.url).searchParams);

export const listingsGet = endpoint(async (r) => reads.readSearch(query(r)));
export const listingGet = endpoint(async (_r, c) =>
  reads.readListing((await paramsOf(c)).id),
);
export const listingEditGet = endpoint(async (r, c) =>
  reads.readListingForEdit(await apiActor(r), (await paramsOf(c)).id),
);
export const listingPost = endpoint(async (r) => {
  const actor = await apiActor(r);
  const body = await readJson(r);
  if ("id" in body) throw new ApiError(400, "Use the listing update endpoint to edit.");
  const id = await saveListing(actor, body);
  changed();
  return json({ id }, 201);
});
export const listingPut = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id } = await paramsOf(c);
  const body = await readJson(r);
  z.object({ version: z.number().int().positive() }).parse(body);
  await saveListing(actor, { ...body, id });
  changed();
  return { id };
});
export const listingDelete = endpoint(async (r, c) => {
  await deleteListing(await apiActor(r), (await paramsOf(c)).id);
  changed();
});
export const listingStatusPut = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id } = await paramsOf(c);
  const { status } = z
    .object({ status: z.enum(["PUBLISHED", "PAUSED", "SOLD", "CLOSED"]) })
    .parse(await readJson(r));
  await transitionListing(actor, id, status);
  changed();
  return { id, status };
});
export const photoPost = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id } = await paramsOf(c);
  if (!r.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new ApiError(415, "Use multipart/form-data with a file field.");
  const bytes = await boundedBytes(r, 9 * 1024 * 1024);
  let form: FormData;
  try {
    form = await new Response(bytes, {
      headers: { "Content-Type": r.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new ApiError(400, "Invalid multipart body.");
  }
  const mediaId = await addListingPhoto(actor, id, form.get("file"));
  changed();
  return json({ id: mediaId }, 201);
});
export const photoDelete = endpoint(async (r, c) => {
  const actor = await apiActor(r);
  const { id, mediaId } = await paramsOf(c);
  await deleteListingPhoto(actor, id, mediaId);
  changed();
});
export const mediaGet = endpoint(async (r, c) => {
  const response = await getListingPhotoResponse(r, (await paramsOf(c)).id, () =>
    apiActor(r),
  );
  response.headers.set("Vary", "Cookie, Authorization");
  return response;
});
