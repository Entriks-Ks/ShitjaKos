"use server";

import { z } from "zod";
import { currentActor } from "@/lib/session";
import type { Actor } from "@/lib/permissions";
import { ChatError } from "@/lib/messaging/policy";
import type { ChatResult } from "@/types/messaging";
import {
  startListingConversation,
  sendChatMessage,
  markChatRead,
  blockChat,
  reportChatMessage,
} from "@/services/messaging";

async function execute<T>(work: (actor: Actor) => Promise<T>): Promise<ChatResult<T>> {
  const actor = await currentActor();
  if (!actor) return { ok: false, error: "Sign in with an active account first." };
  try {
    return { ok: true, data: await work(actor) };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0].message };
    if (error instanceof ChatError) return { ok: false, error: error.message };
    // Do not return database exception text or log private message bodies.
    console.error(
      "Messaging operation failed.",
      error instanceof Error ? error.name : "UnknownError",
    );
    return {
      ok: false,
      error: "Could not complete the request. Please retry.",
    };
  }
}

export async function startConversationAction(raw: unknown) {
  return execute((actor) => startListingConversation(actor, raw));
}
export async function sendMessageAction(raw: unknown) {
  return execute((actor) => sendChatMessage(actor, raw));
}
export async function markReadAction(raw: unknown) {
  return execute((actor) => markChatRead(actor, raw));
}
export async function blockConversationAction(raw: unknown) {
  return execute((actor) => blockChat(actor, raw));
}
export async function reportMessageAction(raw: unknown) {
  return execute((actor) => reportChatMessage(actor, raw));
}
