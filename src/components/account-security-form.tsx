"use client";

import { useActionState, type ReactNode } from "react";
import { accountSecurityAction } from "@/app/(account)/dashboard/profile/actions";
type Props = {
    operation: string;
    submitLabel: string;
    children?: ReactNode;
};

export function AccountSecurityForm({
    operation,
    submitLabel,
    children,
}: Props) {
    const [state, action, pending] = useActionState(
        accountSecurityAction,
        {
            ok: false,
            message: "",
        },
    );

    return (
        <form action={action} className="space-y-4">
            <input
                type="hidden"
                name="operation"
                value={operation}
            />

            <fieldset disabled={pending} className="space-y-4">
                {children}

                <button
                    type="submit"
                    className="btn btn-outline"
                    disabled={pending}
                >
                    {pending ? "Please wait…" : submitLabel}
                </button>
            </fieldset>

            {state.message && (
                <p
                    role={state.ok ? "status" : "alert"}
                    className={
                        state.ok
                            ? "text-sm text-emerald-700"
                            : "text-sm text-red-700"
                    }
                >
                    {state.message}
                </p>
            )}
        </form>
    );
}