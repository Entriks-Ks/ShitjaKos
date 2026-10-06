"use client";

import { useId, useRef } from "react";
import { Mail, X } from "lucide-react";
import { AccountSecurityForm } from "@/components/account-security-form";

const inputClass =
  "mt-2 block w-full rounded-xl border border-stone-300 " +
  "bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-900";

export function ChangeEmailForm() {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        type="button"
        className="btn btn-outline"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <Mail size={16} aria-hidden="true" />
        Change email
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold">
            Change email address
          </h2>
          <button
            type="button"
            aria-label="Close email popup"
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p id={descriptionId} className="mt-3 text-sm text-stone-600">
          Verify your current email, then your new address. Your email stays unchanged
          until both steps are complete.
        </p>
        <div className="mt-5 space-y-5">
          <div className="space-y-3">
            <h3 className="font-medium">1. Verify your current email</h3>

            <AccountSecurityForm
              operation="email-current-code"
              submitLabel="Send code to current email"
            />
          </div>

          <div className="space-y-3 border-t border-stone-200 pt-5">
            <h3 className="font-medium">2. Enter your new email</h3>

            <AccountSecurityForm
              operation="email-new-code"
              submitLabel="Send code to new email"
            >
              <label className="block text-sm font-medium">
                Code from your current email
                <input
                  className={inputClass}
                  name="currentCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </label>

              <label className="block text-sm font-medium">
                New email address
                <input
                  className={inputClass}
                  name="newEmail"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
            </AccountSecurityForm>
          </div>

          <div className="space-y-3 border-t border-stone-200 pt-5">
            <h3 className="font-medium">3. Verify your new email</h3>

            <AccountSecurityForm
              operation="email-confirm"
              submitLabel="Verify and change email"
            >
              <label className="block text-sm font-medium">
                New email address from step 2
                <input
                  className={inputClass}
                  name="newEmail"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>

              <label className="block text-sm font-medium">
                Code sent to your new email
                <input
                  className={inputClass}
                  name="newCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </label>
            </AccountSecurityForm>
          </div>
        </div>
      </dialog>
    </>
  );
}
