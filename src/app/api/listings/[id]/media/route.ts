import { NextRequest } from "next/server";
import { currentUser } from "@/lib/session";
import {
  addListingPhoto,
  deleteListingPhoto,
  MediaOperationError,
} from "@/services/media";

export const runtime = "nodejs";

function validOrigin(request: NextRequest) {
  return (
    request.headers.get("origin") ===
    new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3001").origin
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!validOrigin(request))
    return Response.json({ error: "Invalid origin." }, { status: 403 });
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > 9 * 1024 * 1024) {
    return Response.json(
      { error: "Image is too large (8 MB maximum)." },
      { status: 413 },
    );
  }

  try {
    const { id } = await context.params;
    const form = await request.formData();
    const mediaId = await addListingPhoto(actor, id, form.get("file"));
    return Response.json({ id: mediaId });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof MediaOperationError
            ? error.message
            : "Could not upload photo.",
      },
      { status: error instanceof MediaOperationError ? error.status : 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!validOrigin(request)) return new Response(null, { status: 403 });
  const actor = await currentUser();
  if (!actor) return new Response(null, { status: 401 });
  const mediaId = request.nextUrl.searchParams.get("mediaId");
  if (!mediaId) return new Response(null, { status: 400 });

  try {
    const { id } = await context.params;
    await deleteListingPhoto(actor, id, mediaId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof MediaOperationError && [403, 404].includes(error.status)) {
      return new Response(null, { status: error.status });
    }
    return Response.json(
      { error: "Listing changed. Reload and retry." },
      { status: 409 },
    );
  }
}
