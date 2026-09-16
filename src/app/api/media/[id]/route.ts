import { currentActor } from "@/lib/session";
import { getListingPhotoResponse } from "@/services/media-delivery";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return getListingPhotoResponse(request, id, currentActor);
}
