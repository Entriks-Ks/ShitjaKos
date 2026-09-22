"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { actionErrorMessage } from "@/lib/action-error";
import { changeAccountSuspension } from "@/services/admin-accounts";

export async function changeAccountSuspensionAction(raw: unknown) {
    const actor = await requireUser();

    try {
        await changeAccountSuspension(actor, raw);
    } catch (error) {
        return { error: actionErrorMessage(error) };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    revalidatePath("/admin/businesses");

    revalidatePath("/dashboard", "layout");
    revalidatePath("/business/[id]/edit", "page");
    revalidatePath("/listings/new");
    revalidatePath("/listings/[id]", "page");
    revalidatePath("/listings/[id]/edit", "page");

    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath("/shops");
    revalidatePath("/shops/[slug]", "page");

    return { ok: true };
}