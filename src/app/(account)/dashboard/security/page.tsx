import { ChangeEmailForm } from "@/components/change-email-form";
import { headers } from "next/headers";

import { requireUser } from "@/lib/session";
import { getAccountSecurity } from "@/services/profile";
import { AccountSecurityForm } from "@/components/account-security-form";

const inputClass =
  "mt-2 block w-full rounded-xl border border-stone-300 " +
  "bg-white px-3 py-2.5 text-sm outline-none " +
  "focus:border-stone-900";

export default async function AccountSecurityPage() {
  await requireUser();

  const account = await getAccountSecurity(new Headers(await headers()));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Account security</h1>

        <p className="mt-2 text-sm text-stone-600">
          Manage your password, email and signed-in devices.
        </p>
      </header>

      <section className="workspace-card space-y-5">
        <h2 className="text-lg font-semibold">Change password</h2>

        <p className="text-sm text-stone-600">
          Changing your password signs out your other sessions.
        </p>

        <AccountSecurityForm operation="password" submitLabel="Update password">
          <label className="block text-sm font-medium">
            Current password
            <input
              className={inputClass}
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </label>

          <label className="block text-sm font-medium">
            New password
            <input
              className={inputClass}
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>

          <label className="block text-sm font-medium">
            Confirm new password
            <input
              className={inputClass}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
        </AccountSecurityForm>
      </section>

      <ChangeEmailForm />

      <section className="workspace-card space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Active sessions</h2>

          <p className="mt-2 text-sm text-stone-600">
            These are signed-in sessions, not necessarily distinct physical devices.
          </p>
        </div>

        <ul className="divide-y divide-stone-200">
          {account.sessions.map((session) => (
            <li key={session.id} className="space-y-3 py-4">
              <div>
                <p className="break-words text-sm font-medium">{session.userAgent}</p>

                <p className="mt-1 text-xs text-stone-500">
                  Signed in:{" "}
                  {new Date(session.createdAt).toLocaleString("en-GB", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </p>

                {session.current && (
                  <span className="mt-2 inline-block rounded-full bg-stone-100 px-3 py-1 text-xs">
                    Current session
                  </span>
                )}
              </div>

              {!session.current && (
                <AccountSecurityForm
                  operation="revoke-session"
                  submitLabel="Sign out this session"
                >
                  <input type="hidden" name="sessionId" value={session.id} />
                </AccountSecurityForm>
              )}
            </li>
          ))}
        </ul>

        <AccountSecurityForm
          operation="revoke-other-sessions"
          submitLabel="Sign out all other sessions"
        />
      </section>
    </div>
  );
}
