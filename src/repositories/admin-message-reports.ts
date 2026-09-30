import "server-only"

import { Prisma } from "@/generated/prisma/client"
import { getPrisma } from "@/lib/prisma"

export const MESSAGE_REPORT_PAGE_SIZE = 20;


export type MessageReportStatus =
    | "OPEN"
    | "RESOLVED"
    | "DISMISSED";





export async function findAdminMessageReports(
    status: MessageReportStatus,
    page: number,
) {
    const db = getPrisma();

    const where: Prisma.MessageReportWhereInput = {
        status,
    };

    const [items, total] = await Promise.all([
        db.messageReport.findMany({
            where,
            select: {
                id: true,
                reason: true,
                status: true,
                createdAt: true,

                reporter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        suspendedAt: true,
                    },
                },

                message: {
                    select: {
                        id: true,
                        body: true,
                        senderSide: true,
                        createdAt: true,

                        sender: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                suspendedAt: true,
                            },
                        },
                    },
                },

                conversation: {
                    select: {
                        id: true,
                        listingId: true,
                        sourceListingId: true,
                        listingTitle: true,
                    },
                },
            },
            orderBy: [
                {
                    createdAt: "desc",
                },
                {
                    id: "desc",
                },
            ],
            skip: (page - 1) * MESSAGE_REPORT_PAGE_SIZE,
            take: MESSAGE_REPORT_PAGE_SIZE,
        }),

        db.messageReport.count({
            where,
        }),
    ]);

    return {
        items,
        total,
    };
}



export function findMessageReportForReview(
    tx: Prisma.TransactionClient,
    reportId: string,
) {
    return tx.messageReport.findUnique({
        where: {
            id: reportId,
        },
        select: {
            id: true,
            status: true,
            conversationId: true,
            messageId: true,
            reporterId: true,

            message: {
                select: {
                    senderId: true,
                },
            },
        },
    });
}



export function updateOpenMessageReport(
    tx: Prisma.TransactionClient,
    reportId: string,
    status: Exclude<MessageReportStatus, "OPEN">,
) {
    return tx.messageReport.updateMany({
        where: {
            id: reportId,
            status: "OPEN",
        },
        data: {
            status,
        },
    });
}