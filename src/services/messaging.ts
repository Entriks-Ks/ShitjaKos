import "server-only";
import type { Actor } from "@/lib/permissions";
import { ChatError, conversationSide } from "@/lib/messaging/policy";
import type { ChatMessage, ChatView } from "@/types/messaging";
import {
  startMessageInput,
  sendMessageInput,
  messagePageInput,
  readMessageInput,
  blockMessageInput,
  reportMessageInput,
} from "@/lib/validations/messaging";
import { withTransaction } from "@/repositories/transaction";
import { recordAudit } from "@/repositories/audit";
import * as records from "@/repositories/messaging";

type Tx = Parameters<Parameters<typeof withTransaction>[0]>[0];
type Context = NonNullable<Awaited<ReturnType<typeof records.findConversation>>>;
type StoredMessage = Awaited<ReturnType<typeof records.insertMessage>>;

async function activeActor(tx: Tx, actor: Actor, write = false) {
  const current = write
    ? await records.lockChatActor(tx, actor.id)
    : await records.findChatActor(tx, actor.id);
  if (!current || current.suspendedAt || !current.emailVerified) {
    throw new ChatError("An active, verified account is required.", 403);
  }
  return current;
}

async function context(tx: Tx, actor: Actor, id: string) {
  const conversation = await records.findConversation(tx, id);
  if (!conversation) throw new ChatError("Conversation not found.", 404);
  const side = conversationSide(actor, conversation);
  return { conversation, side };
}

function sendingAllowed(conversation: Context) {
  if (conversation.blocks.length || conversation.buyer.suspendedAt) return false;
  if (conversation.sellerKind === "PERSONAL") {
    return !!conversation.sellerUser && !conversation.sellerUser.suspendedAt;
  }
  return (
    !!conversation.business &&
    !conversation.business.suspendedAt &&
    conversation.business.reviewStatus === "APPROVED"
  );
}

function dto(message: StoredMessage, userId: string): ChatMessage {
  return {
    id: message.id,
    clientId: message.clientId,
    sequence: message.sequence,
    body: message.body,
    mine: message.senderId === userId,
    side: message.senderSide,
    createdAt: message.createdAt.toISOString(),
  };
}

async function sendInside(
  tx: Tx,
  actor: Actor,
  input: { conversationId: string; clientId: string; body: string },
) {
  const { conversation, side } = await context(tx, actor, input.conversationId);
  const previous = await records.findMessageRequest(
    tx,
    conversation.id,
    actor.id,
    input.clientId,
  );
  if (previous) {
    if (previous.body !== input.body)
      throw new ChatError("Retry the original message or send a new request.");
    return dto(previous, actor.id);
  }
  if (!sendingAllowed(conversation))
    throw new ChatError("Messaging is unavailable for this conversation.", 403);
  // These are initial product limits, not numbers prescribed by the briefing.
  if (
    (await records.countRecentMessages(tx, actor.id, new Date(Date.now() - 60_000))) >= 20
  ) {
    throw new ChatError("Please wait a minute before sending more messages.", 429);
  }
  const message = await records.insertMessage(tx, {
    ...input,
    senderId: actor.id,
    senderSide: side,
  });
  // Notification jobs should be inserted here in the SAME transaction.
  // Do not send SMTP email inside a database transaction.
  return dto(message, actor.id);
}

export async function startListingConversation(actor: Actor, raw: unknown) {
  const input = startMessageInput.parse(raw);
  return withTransaction(async (tx) => {
    const current = await activeActor(tx, actor, true);
    let conversation = await records.findBuyerConversation(
      tx,
      current.id,
      input.listingId,
    );
    if (!conversation) {
      const listing = await records.findChatListing(tx, input.listingId);
      if (!listing)
        throw new ChatError("Listing is not available for new inquiries.", 404);
      if (
        listing.personalProfile?.userId === current.id ||
        listing.business?.memberships.some((m) => m.userId === current.id)
      ) {
        throw new ChatError("You cannot message your own listing.");
      }
      if (!!listing.personalProfile === !!listing.business) {
        throw new ChatError("This listing has an invalid seller.", 409);
      }
      if (
        (await records.countRecentConversations(
          tx,
          current.id,
          new Date(Date.now() - 3_600_000),
        )) >= 10
      ) {
        throw new ChatError("Please wait before contacting more sellers.", 429);
      }
      conversation = await records.insertConversation(tx, {
        buyerId: current.id,
        listingId: listing.id,
        sourceListingId: listing.id,
        listingTitle: listing.title,
        sellerName: listing.business?.publicName ?? listing.personalProfile!.displayName,
        sellerKind: listing.business ? "BUSINESS" : "PERSONAL",
        businessId: listing.businessId,
        sellerUserId: listing.business ? null : listing.personalProfile!.userId,
      });
      await recordAudit(tx, current.id, "conversation.created", conversation.id, {
        listingId: listing.id,
      });
    }
    await sendInside(tx, current, {
      conversationId: conversation.id,
      clientId: input.clientId,
      body: input.body,
    });
    return { conversationId: conversation.id };
  });
}

export async function sendChatMessage(actor: Actor, raw: unknown) {
  const input = sendMessageInput.parse(raw);
  return withTransaction(async (tx) => {
    const current = await activeActor(tx, actor, true);
    return sendInside(tx, current, input);
  });
}

export async function getChat(actor: Actor, raw: unknown): Promise<ChatView> {
  const input = messagePageInput.parse(raw);
  return withTransaction(async (tx) => {
    const current = await activeActor(tx, actor);
    const { conversation, side } = await context(tx, current, input.conversationId);
    const messages = await records.findMessagePage(
      tx,
      conversation.id,
      input.before,
      input.after,
    );
    const selected = messages.slice(0, 50);
    if (input.after === undefined) selected.reverse();
    return {
      id: conversation.id,
      title: conversation.listingTitle,
      otherName:
        side === "BUYER"
          ? (conversation.business?.publicName ?? conversation.sellerName)
          : conversation.buyer.name,
      listingId: conversation.listingId,
      side,
      canSend: sendingAllowed(conversation),
      blockedByMe: conversation.blocks.some((block) => block.side === side),
      messages: selected.map((message) => dto(message, current.id)),
      hasMore: messages.length > 50,
    };
  });
}

export async function getChatInbox(actor: Actor, page = 1) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10_000)
    throw new ChatError("Invalid page.");
  return withTransaction(async (tx) => {
    const current = await activeActor(tx, actor);
    const conversations = await records.findInboxPage(tx, current.id, page);
    const items = [];
    for (const conversation of conversations.slice(0, 20)) {
      // Reuse the same rule; skip ambiguous buyer/business membership collisions.
      let side: "BUYER" | "SELLER";
      try {
        side = conversationSide(current, conversation);
      } catch (error) {
        if (error instanceof ChatError) continue;
        throw error;
      }
      items.push({
        id: conversation.id,
        title: conversation.listingTitle,
        otherName:
          side === "BUYER"
            ? (conversation.business?.publicName ?? conversation.sellerName)
            : conversation.buyer.name,
        preview: conversation.messages[0]?.body.slice(0, 120) ?? "",
        unread: await records.countUnread(
          tx,
          conversation.id,
          side,
          conversation.readStates[0]?.lastSequence ?? 0,
        ),
      });
    }
    return { items, hasMore: conversations.length > 20 };
  });
}

export async function markChatRead(actor: Actor, raw: unknown) {
  const input = readMessageInput.parse(raw);
  return withTransaction(async (tx) => {
    const current = await activeActor(tx, actor, true);
    await context(tx, current, input.conversationId);
    if (
      !(await records.findMessageAtSequence(tx, input.conversationId, input.sequence))
    ) {
      throw new ChatError("Message not found.", 404);
    }
    await records.advanceReadState(tx, input.conversationId, current.id, input.sequence);
    return { saved: true };
  });
}

export async function blockChat(actor: Actor, raw: unknown) {
  const input = blockMessageInput.parse(raw);
  return withTransaction(async (tx) => {
    const current = await activeActor(tx, actor, true);
    const { conversation, side } = await context(tx, current, input.conversationId);
    if (conversation.blocks.some((block) => block.side === side) === input.blocked) {
      return { blocked: input.blocked };
    }
    await records.setConversationBlock(
      tx,
      input.conversationId,
      side,
      current.id,
      input.blocked,
    );
    await recordAudit(
      tx,
      current.id,
      input.blocked ? "conversation.blocked" : "conversation.unblocked",
      input.conversationId,
      { side },
    );
    return { blocked: input.blocked };
  });
}

export async function reportChatMessage(actor: Actor, raw: unknown) {
  const input = reportMessageInput.parse(raw);
  return withTransaction(async (tx) => {
    const current = await activeActor(tx, actor, true);
    const { side } = await context(tx, current, input.conversationId);
    const message = await records.findReportableMessage(
      tx,
      input.conversationId,
      input.messageId,
    );
    if (!message || message.senderSide === side)
      throw new ChatError("Choose a message from the other party.");
    const previous = await records.findExistingReport(tx, message.id, current.id);
    if (previous) return { reportId: previous.id };
    if (
      (await records.countRecentReports(
        tx,
        current.id,
        new Date(Date.now() - 3_600_000),
      )) >= 10
    ) {
      throw new ChatError("Please wait before submitting more reports.", 429);
    }
    const report = await records.insertMessageReport(tx, {
      ...input,
      reporterId: current.id,
    });
    await recordAudit(tx, current.id, "message.reported", report.id, {
      conversationId: input.conversationId,
      messageId: message.id,
    });
    return { reportId: report.id };
  });
}
