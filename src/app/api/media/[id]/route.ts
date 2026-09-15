import { currentUser } from "@/lib/session";
import { canManageListing, isStaff } from "@/lib/permissions";
import {
  getListingMedia,
  getListingOwnershipDetails,
  getPublicListingMarker,
} from "@/repositories/listings";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const media = await getListingMedia(id);
  if (!media) return new Response(null, { status: 404 });
  const visible = await getPublicListingMarker(media.listingId);
  if (!visible) {
    const user = await currentUser();
    if (!user) return new Response(null, { status: 404 });
    const item = await getListingOwnershipDetails(media.listingId);
    if (!item || (!canManageListing(user, item) && !isStaff(user)))
      return new Response(null, { status: 404 });
  }
  try {
    const data = await readFile(join(process.cwd(), ".uploads", media.storageKey));
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
