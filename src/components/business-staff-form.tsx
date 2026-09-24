"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";

import { businessStaffAction } from "@/actions/business-staff";
import styles from "./business-staff.module.css";

type Props = {
  fields: Record<string, string>;
  label: string;
  children?: ReactNode;
  confirmation?: string;
  variant?: "primary" | "quiet";
};

export function BusinessStaffForm({
  fields,
  label,
  children,
  confirmation,
  variant = "quiet",
}: Props) {
  const [state, action, pending] = useActionState(businessStaffAction, {
    error: "",
    success: "",
  });

  const [confirming, setConfirming] = useState(false);

  return (
    <form action={action} className="space-y-3">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {children}

      {confirmation && !confirming ? (
        <button
          type="button"
          className={styles.quiet}
          onClick={() => setConfirming(true)}
        >
          {label}
        </button>
      ) : (
        <div className="space-y-3">
          {confirmation && <p className="text-sm text-stone-600">{confirmation}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={variant === "primary" ? styles.primary : styles.quiet}
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Saving…" : label}
            </button>

            {confirmation && (
              <button
                type="button"
                className="btn btn-outline"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                Keep access
              </button>
            )}
          </div>
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}

      {state.success && (
        <p role="status" className="text-sm text-emerald-700">
          {state.success}
        </p>
      )}
    </form>
  );
}
