import { currentActor } from "@/lib/session";
import { getChat } from "@/services/messaging";
import { chatJson, chatHttpError } from "@/lib/messaging/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await currentActor();
    if (!actor) return chatJson({ error: "Sign in first." }, 401);
    const { id } = await context.params;
    const query = new URL(request.url).searchParams;
    return chatJson(
      await getChat(actor, {
        conversationId: id,
        before: query.get("before") ?? undefined,
        after: query.get("after") ?? undefined,
      }),
    );
  } catch (error) {
    return chatHttpError(error);
  }
}
