"use server";

import { revalidatePath } from "next/cache";

import { actionErrorMessage } from "@/lib/action-error";
import { requireUser } from "@/lib/session";
import { reviewMessageReport } from "@/services/admin-message-reports";

export async function reviewMessageReportAction(
    raw: unknown,
) {
    const actor = await requireUser();

    try {
        const result = await reviewMessageReport(
            actor,
            raw,
        );

        revalidatePath("/admin");
        revalidatePath("/admin/message-reports");

        return {
            ok: true as const,
            data: result,
            error: "",
        };
    } catch (error) {
        return {
            ok: false as const,
            data: null,
            error: actionErrorMessage(error),
        };
    }
}