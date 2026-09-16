import "server-only";
import { canManageListing, isStaff, type Actor } from "@/lib/permissions";
import {
  getListingMedia,
  getListingOwnershipDetails,
  getPublicListingMedia,
} from "@/repositories/listings";
import { readListingImage } from "@/lib/listing-images";
export async function getListingPhotoResponse(
  request: Request,
  id: string,
  currentUser: () => Promise<Actor | null>,
) {
  const publicMedia = await getPublicListingMedia(id);
  let media = publicMedia;
  if (!publicMedia) {
    const privateMedia = await getListingMedia(id);
    if (!privateMedia)
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
      });
    const user = await currentUser();
    if (!user)
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
      });
    const item = await getListingOwnershipDetails(privateMedia.listingId);
    if (!item || (!canManageListing(user, item) && !isStaff(user)))
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
      });
    media = privateMedia;
  }
  if (!media)
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
  const thumbnail = new URL(request.url).searchParams.get("size") === "thumb";
  const etag = `"${media.id}-${thumbnail ? "thumb-v1" : "full-v1"}"`;
  const responseHeaders = new Headers({
    "Content-Type": "image/webp",
    // Public photos may be stored, but visibility must be rechecked before reuse.
    // Draft/paused photos remain uncacheable even for their owner.
    "Cache-Control": publicMedia ? "private, no-cache" : "private, no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Cookie",
  });
  if (publicMedia) {
    responseHeaders.set("ETag", etag);
    const matches = request.headers
      .get("if-none-match")
      ?.split(",")
      .some((value) => value.trim().replace(/^W\//, "") === etag);
    if (matches) return new Response(null, { status: 304, headers: responseHeaders });
  }
  try {
    const data = await readListingImage(media.storageKey, thumbnail);
    return new Response(new Uint8Array(data), {
      headers: responseHeaders,
    });
  } catch {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
  }
}
