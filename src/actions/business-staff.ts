
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/session";
import {
    BusinessStaffError,
    changeBusinessStaff,
} from "@/services/business-staff";

export async function businessStaffAction(
    _previous: { error: string; success: string },
    formData: FormData,
): Promise<{ error: string; success: string }> {
    const actor = await requireUser();

    let businessId: string;
    let warning = "";

    try {
        const result = await changeBusinessStaff(actor, {
            kind: formData.get("kind"),
            businessId: formData.get("businessId"),
            email: String(formData.get("email") ?? "").trim(),
            invitationId: formData.get("invitationId"),
            userId: formData.get("userId"),
        });
        businessId = result.businessId;
        warning = result.warning;
    } catch (error) {
        if (error instanceof BusinessStaffError) {
            return { error: error.message, success: "" };
        }

        if (error instanceof z.ZodError) {
            return {
                error: error.issues[0]?.message ?? "Invalid request.",
                success: "",
            };
        }

        console.error("Business staff operation failed.", error);

        return {
            error: "Could not save this change. Please try again.",
            success: "",
        };
    }

    revalidatePath(`/business/${businessId}/staff`);
    revalidatePath("/dashboard/shops");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/messages");
    revalidatePath("/listings/new");

    return { error: "", success: warning || "Change saved." };
}
