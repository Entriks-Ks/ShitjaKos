import { currentActor } from "@/lib/session";
import { getChatInbox } from "@/services/messaging";
import { chatJson, chatHttpError } from "@/lib/messaging/http";

export async function GET(request: Request) {
  try {
    const actor = await currentActor();
    if (!actor) return chatJson({ error: "Sign in first." }, 401);
    const page = Number(new URL(request.url).searchParams.get("page") ?? "1");
    return chatJson(await getChatInbox(actor, page));
  } catch (error) {
    return chatHttpError(error);
  }
}
