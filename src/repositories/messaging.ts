import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { publicWhere } from "./listings";

type Tx = Prisma.TransactionClient;

const person = { id: true, name: true, suspendedAt: true } as const;

const contextInclude = {
  buyer: { select: person },
  sellerUser: { select: person },
  business: {
    select: {
      publicName: true,
      suspendedAt: true,
      reviewStatus: true,
      memberships: { select: { userId: true, role: true } },
    },
  },
  blocks: true,
} satisfies Prisma.ConversationInclude;

export function findChatActor(tx: Tx, id: string) {
  return tx.user.findUnique({
    where: { id },
    select: { id: true, role: true, suspendedAt: true, emailVerified: true },
  });
}

export async function lockChatActor(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
  return findChatActor(tx, id);
}

export function findChatListing(tx: Tx, id: string) {
  return tx.listing.findFirst({
    where: { id, ...publicWhere() },
    select: {
      id: true,
      title: true,
      businessId: true,
      personalProfile: { select: { userId: true, displayName: true } },
      business: {
        select: { publicName: true, memberships: { select: { userId: true } } },
      },
    },
  });
}

export function findBuyerConversation(tx: Tx, buyerId: string, sourceListingId: string) {
  return tx.conversation.findUnique({
    where: { buyerId_sourceListingId: { buyerId, sourceListingId } },
  });
}

export function insertConversation(
  tx: Tx,
  data: Pick<
    Prisma.ConversationUncheckedCreateInput,
    | "buyerId"
    | "listingId"
    | "sourceListingId"
    | "listingTitle"
    | "sellerName"
    | "sellerKind"
    | "sellerUserId"
    | "businessId"
  >,
) {
  return tx.conversation.create({ data });
}

export function findConversation(tx: Tx, id: string) {
  return tx.conversation.findUnique({
    where: { id },
    include: contextInclude,
  });
}

export function findMessageRequest(
  tx: Tx,
  conversationId: string,
  senderId: string,
  clientId: string,
) {
  return tx.message.findUnique({
    where: {
      conversationId_senderId_clientId: { conversationId, senderId, clientId },
    },
  });
}

export function countRecentMessages(tx: Tx, senderId: string, since: Date) {
  return tx.message.count({ where: { senderId, createdAt: { gte: since } } });
}

export function countRecentConversations(tx: Tx, buyerId: string, since: Date) {
  return tx.conversation.count({
    where: { buyerId, createdAt: { gte: since } },
  });
}

export async function insertMessage(
  tx: Tx,
  input: {
    conversationId: string;
    senderId: string;
    clientId: string;
    body: string;
    senderSide: "BUYER" | "SELLER";
  },
) {
  const conversation = await tx.conversation.update({
    where: { id: input.conversationId },
    data: { lastSequence: { increment: 1 }, updatedAt: new Date() },
    select: { lastSequence: true },
  });
  return tx.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      senderSide: input.senderSide,
      clientId: input.clientId,
      body: input.body,
      sequence: conversation.lastSequence,
    },
  });
}

export function findMessagePage(
  tx: Tx,
  conversationId: string,
  before?: number,
  after?: number,
) {
  return tx.message.findMany({
    where: {
      conversationId,
      sequence:
        before !== undefined
          ? { lt: before }
          : after !== undefined
            ? { gt: after }
            : undefined,
    },
    orderBy: { sequence: after !== undefined ? "asc" : "desc" },
    take: 51,
  });
}

export function findMessageAtSequence(tx: Tx, conversationId: string, sequence: number) {
  return tx.message.findUnique({
    where: { conversationId_sequence: { conversationId, sequence } },
    select: { id: true },
  });
}

export async function advanceReadState(
  tx: Tx,
  conversationId: string,
  userId: string,
  sequence: number,
) {
  await tx.conversationReadState.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId },
    update: {},
  });
  // Never move backwards when requests arrive out of order.
  await tx.conversationReadState.updateMany({
    where: { conversationId, userId, lastSequence: { lt: sequence } },
    data: { lastSequence: sequence },
  });
}

export function findInboxPage(tx: Tx, userId: string, page: number) {
  return tx.conversation.findMany({
    where: {
      OR: [
        { buyerId: userId },
        { sellerUserId: userId },
        {
          business: {
            memberships: {
              some: { userId, role: { in: ["OWNER", "MANAGER"] } },
            },
          },
        },
      ],
    },
    include: {
      ...contextInclude,
      readStates: { where: { userId }, select: { lastSequence: true } },
      messages: { orderBy: { sequence: "desc" }, take: 1 },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 20,
    take: 21,
  });
}

export function countUnread(
  tx: Tx,
  conversationId: string,
  side: "BUYER" | "SELLER",
  after: number,
) {
  return tx.message.count({
    where: {
      conversationId,
      senderSide: { not: side },
      sequence: { gt: after },
    },
  });
}

export function setConversationBlock(
  tx: Tx,
  conversationId: string,
  side: "BUYER" | "SELLER",
  actorId: string,
  blocked: boolean,
) {
  if (!blocked)
    return tx.conversationBlock.deleteMany({ where: { conversationId, side } });
  return tx.conversationBlock.upsert({
    where: { conversationId_side: { conversationId, side } },
    create: { conversationId, side, actorId },
    update: { actorId },
  });
}

export function findReportableMessage(tx: Tx, conversationId: string, id: string) {
  return tx.message.findFirst({ where: { id, conversationId } });
}

export function countRecentReports(tx: Tx, reporterId: string, since: Date) {
  return tx.messageReport.count({
    where: { reporterId, createdAt: { gte: since } },
  });
}

export function findExistingReport(tx: Tx, messageId: string, reporterId: string) {
  return tx.messageReport.findUnique({
    where: { messageId_reporterId: { messageId, reporterId } },
    select: { id: true },
  });
}

export function insertMessageReport(
  tx: Tx,
  data: {
    conversationId: string;
    messageId: string;
    reporterId: string;
    reason: string;
  },
) {
  return tx.messageReport.upsert({
    where: {
      messageId_reporterId: {
        messageId: data.messageId,
        reporterId: data.reporterId,
      },
    },
    create: data,
    update: {},
  });
}
