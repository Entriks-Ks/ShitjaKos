import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getChat } from "@/services/messaging";
import { ChatError } from "@/lib/messaging/policy";
import { ConversationThread } from "@/components/messaging/conversation-thread";
import type { ChatView } from "@/types/messaging";

export const metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const { id } = await params;
  let initial: ChatView;
  try {
    initial = await getChat(actor, { conversationId: id });
  } catch (error) {
    if (error instanceof ChatError && [403, 404].includes(error.status)) notFound();
    throw error;
  }
  return <ConversationThread key={id} initial={initial} />;
}
