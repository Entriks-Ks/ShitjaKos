import "server-only";

import { z } from "zod";

import type { Actor } from "@/lib/permissions";
import { recordAudit } from "@/repositories/audit";
import { findModerationUser } from "@/repositories/admin-accounts";
import {
    findMessageReportForReview,
    updateOpenMessageReport,
} from "@/repositories/admin-message-reports";
import { withTransaction } from "@/repositories/transaction";


const reviewMessageReportInput = z.object({
    reportId: z.string().trim().min(1).max(100),

    decision: z.enum([
        "RESOLVED",
        "DISMISSED",
    ]),

    note: z
        .string()
        .trim()
        .min(5, "Explain the moderation decision.")
        .max(1000),
});





export async function reviewMessageReport(actor: Actor, raw: unknown,) {
    const input = reviewMessageReportInput.parse(raw);

    return withTransaction(async (tx) => {
        /*
         * Re-read the admin from the database.
         * Never trust only the role contained in the earlier session object.
         */
        const admin = await findModerationUser(
            tx,
            actor.id,
        );

        if (
            !admin ||
            admin.role !== "ADMIN" ||
            admin.suspendedAt
        ) {
            throw new Error(
                "Only an active administrator can review reports.",
            );
        }

        const report = await findMessageReportForReview(
            tx,
            input.reportId,
        );

        if (!report) {
            throw new Error("Message report not found.");
        }

        if (report.status !== "OPEN") {
            throw new Error(
                "This report has already been reviewed.",
            );
        }

        const updated = await updateOpenMessageReport(
            tx,
            report.id,
            input.decision,
        );

        if (updated.count !== 1) {
            throw new Error(
                "Another administrator already reviewed this report.",
            );
        }

        await recordAudit(
            tx,
            admin.id,
            input.decision === "RESOLVED"
                ? "message-report.resolved"
                : "message-report.dismissed",
            report.id,
            {
                note: input.note,
                messageId: report.messageId,
                conversationId: report.conversationId,
                reporterId: report.reporterId,
                senderId: report.message.senderId,
            },
        );

        return {
            reportId: report.id,
            status: input.decision,
        };
    });
}