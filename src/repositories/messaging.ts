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
      memberships: { select: { userId: true, role: true, joinedAt: true } },
    },
  },
  blocks: true,
} satisfies Prisma.ConversationInclude;

const detailInclude = {
  ...contextInclude,
  listing: {
    select: {
      media: {
        orderBy: { position: "asc" },
        take: 1,
        select: { id: true, altText: true },
      },
    },
  },
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
    include: detailInclude,
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
    where: {
      id: input.conversationId,
    },
    data: {
      lastSequence: {
        increment: 1,
      },
      updatedAt: new Date(),
    },
    select: {
      lastSequence: true,
    },
  });

  const message = await tx.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      senderSide: input.senderSide,
      clientId: input.clientId,
      body: input.body,
      sequence: conversation.lastSequence,
    },
  });

  // A new message makes the conversation visible again.
  // deletedThroughSequence remains unchanged, so previously
  // deleted messages stay hidden for that user.
  await tx.conversationReadState.updateMany({
    where: {
      conversationId: input.conversationId,
      deletedAt: {
        not: null,
      },
    },
    data: {
      deletedAt: null,
    },
  });

  return message;
}

export function findMessagePage(
  tx: Tx,
  conversationId: string,
  deletedThroughSequence: number,
  before?: number,
  after?: number,
) {
  const sequence =
    before !== undefined
      ? {
          gt: deletedThroughSequence,
          lt: before,
        }
      : {
          gt: Math.max(deletedThroughSequence, after ?? 0),
        };

  return tx.message.findMany({
    where: {
      conversationId,
      sequence,
    },
    orderBy: {
      sequence: after !== undefined ? "asc" : "desc",
    },
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

export async function findInboxPage(tx: Tx, userId: string, page: number) {
  const memberships = await tx.businessMembership.findMany({
    where: { userId, role: { in: ["OWNER", "STAFF"] } },
    select: { businessId: true, role: true, joinedAt: true },
  });
  return tx.conversation.findMany({
    where: {
      AND: [
        {
          OR: [
            {
              buyerId: userId,
            },
            {
              sellerUserId: userId,
            },
            ...memberships.map((membership) => ({
              businessId: membership.businessId,
              ...(membership.role === "STAFF"
                ? { createdAt: { gte: membership.joinedAt } }
                : {}),
            })),
          ],
        },
        {
          readStates: {
            none: {
              userId,
              deletedAt: {
                not: null,
              },
            },
          },
        },
      ],
    },
    include: {
      ...contextInclude,

      readStates: {
        where: {
          userId,
        },
        select: {
          lastSequence: true,
          deletedThroughSequence: true,
          deletedAt: true,
        },
      },

      messages: {
        orderBy: {
          sequence: "desc",
        },
        take: 1,
      },
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        id: "desc",
      },
    ],
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

type UnreadSummaryRow = {
  totalUnread: number;
  messageId: string;
  conversationId: string;
  title: string;
  otherName: string;
  preview: string;
  createdAt: Date;
};

export async function findUnreadMessageSummary(
  tx: Tx,
  userId: string,
  readingConversationId: string | null = null,
) {
  const rows = await tx.$queryRaw<UnreadSummaryRow[]>`
    WITH accessible AS (
      SELECT
        conversation.*,
        CASE
          WHEN conversation."buyerId" = ${userId} THEN 'BUYER'
          ELSE 'SELLER'
        END AS side
      FROM "Conversation" AS conversation
      WHERE
        (
          conversation."buyerId" = ${userId}
          AND NOT (
            conversation."sellerUserId" = ${userId}
            OR EXISTS (
              SELECT 1
              FROM "BusinessMembership" AS membership
              WHERE membership."businessId" = conversation."businessId"
                AND membership."userId" = ${userId}
                AND membership.role IN (
                  'OWNER'::"BusinessRole",
                  'STAFF'::"BusinessRole"
                )
            )
          )
        )
        OR
        (
          conversation."buyerId" <> ${userId}
          AND (
            conversation."sellerUserId" = ${userId}
            OR EXISTS (
              SELECT 1
              FROM "BusinessMembership" AS membership
              WHERE membership."businessId" = conversation."businessId"
                AND membership."userId" = ${userId}
                AND (
                  membership.role = 'OWNER'::"BusinessRole"
                  OR (
                    membership.role = 'STAFF'::"BusinessRole"
                    AND conversation."createdAt" >= membership."joinedAt"
                  )
                )
            )
          )
        )
    ), unread AS (
      SELECT
        message.id AS "messageId",
        message."conversationId",
        accessible."listingTitle" AS title,
        CASE
          WHEN accessible.side = 'BUYER'
            THEN COALESCE(business."publicName", accessible."sellerName")
          ELSE buyer.name
        END AS "otherName",
        LEFT(message.body, 120) AS preview,
        message."createdAt"
      FROM accessible
      JOIN "Message" AS message
        ON message."conversationId" = accessible.id
      JOIN "User" AS buyer
        ON buyer.id = accessible."buyerId"
      LEFT JOIN "Business" AS business
        ON business.id = accessible."businessId"
      LEFT JOIN "ConversationReadState" AS read_state
        ON read_state."conversationId" = accessible.id
        AND read_state."userId" = ${userId}
      WHERE read_state."deletedAt" IS NULL
        AND (${readingConversationId}::text IS NULL OR accessible.id <> ${readingConversationId})
  AND message.sequence > GREATEST(
    COALESCE(read_state."lastSequence", 0),
    COALESCE(
      read_state."deletedThroughSequence",
      0
    )
  )
        AND (
          (accessible.side = 'BUYER' AND message."senderSide" = 'SELLER'::"MessageSide")
          OR
          (accessible.side = 'SELLER' AND message."senderSide" = 'BUYER'::"MessageSide")
        )
    )
    SELECT
      COUNT(*) OVER()::int AS "totalUnread",
      unread."messageId",
      unread."conversationId",
      unread.title,
      unread."otherName",
      unread.preview,
      unread."createdAt"
    FROM unread
    ORDER BY unread."createdAt" DESC, unread."messageId" DESC
    LIMIT 1
  `;

  const latest = rows[0];
  return {
    unread: Number(latest?.totalUnread ?? 0),
    latest: latest
      ? {
          messageId: latest.messageId,
          conversationId: latest.conversationId,
          title: latest.title,
          otherName: latest.otherName,
          preview: latest.preview,
          createdAt: latest.createdAt.toISOString(),
        }
      : null,
  };
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

export async function lockConversation(tx: Tx, conversationId: string) {
  await tx.$queryRaw`
    SELECT "id"
    FROM "Conversation"
    WHERE "id" = ${conversationId}
    FOR UPDATE
  `;
}

export function findConversationParticipantState(
  tx: Tx,
  conversationId: string,
  userId: string,
) {
  return tx.conversationReadState.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    select: {
      lastSequence: true,
      deletedThroughSequence: true,
      deletedAt: true,
    },
  });
}

export function hideConversationForUser(
  tx: Tx,
  conversationId: string,
  userId: string,
  throughSequence: number,
) {
  return tx.conversationReadState.upsert({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    create: {
      conversationId,
      userId,
      lastSequence: throughSequence,
      deletedThroughSequence: throughSequence,
      deletedAt: new Date(),
    },
    update: {
      lastSequence: throughSequence,
      deletedThroughSequence: throughSequence,
      deletedAt: new Date(),
    },
  });
}
