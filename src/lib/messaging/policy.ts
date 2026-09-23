import type { Actor } from "@/lib/permissions";

export class ChatError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

type AccessContext = {
  buyerId: string;
  sellerUserId: string | null;
  sellerKind: "PERSONAL" | "BUSINESS";
  business: {
    memberships: { userId: string; role: string }[];
  } | null;
};

export function conversationSide(actor: Actor, conversation: AccessContext) {
  if (actor.suspendedAt) throw new ChatError("Account unavailable.", 403);
  // If a former buyer later joins the seller business, deny ambiguous access.
  const seller =
    conversation.sellerKind === "PERSONAL"
      ? conversation.sellerUserId === actor.id
      : !!conversation.business?.memberships.some(
          (m) => m.userId === actor.id && ["OWNER", "MANAGER"].includes(m.role),
        );
  const buyer = conversation.buyerId === actor.id;
  if (buyer && seller) throw new ChatError("Conversation access needs review.", 403);
  if (buyer) return "BUYER" as const;
  if (seller) return "SELLER" as const;
  // No automatic admin bypass for private message history.
  throw new ChatError("Conversation not found.", 404);
}
