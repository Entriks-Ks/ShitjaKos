"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/navigation-link";
import { authClient } from "@/lib/auth-client";
import {
  finishRegistrationAction,
  resendRegistrationCodeAction,
} from "@/app/(auth)/register/actions";

export function VerifyEmailForm({
  initialEmail,
  registrationId,
}: {
  initialEmail: string;
  registrationId: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-5">
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setMessage("");
          setBusy(true);
          try {
            if (registrationId) {
              const result = await finishRegistrationAction({
                registrationId,
                email: email.trim(),
                code: otp,
              });
              if (result.error) {
                setError(result.error);
              } else {
                router.replace("/login?registered=1");
              }
              return;
            }
            const result = await authClient.emailOtp.verifyEmail({
              email: email.trim(),
              otp,
            });
            if (result.error) {
              setError(result.error.message ?? "The code could not be verified.");
              return;
            }
            router.replace("/dashboard");
            router.refresh();
          } catch {
            setError("Could not connect. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          Verification code
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            required
          />
        </label>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <button className="btn btn-primary w-full" disabled={busy || otp.length !== 6}>
          {busy ? "Verifying…" : "Verify email"}
        </button>
      </form>
      <button
        type="button"
        className="btn btn-outline w-full"
        disabled={busy || !email.trim()}
        onClick={async () => {
          setError("");
          setMessage("");
          setBusy(true);
          try {
            if (registrationId) {
              const result = await resendRegistrationCodeAction({
                registrationId,
                email: email.trim(),
              });
              if (result.error) setError(result.error);
              else {
                setMessage(
                  "A new code has been sent. Enter it here to create your account.",
                );
                setOtp("");
              }
              return;
            }
            const result = await authClient.emailOtp.sendVerificationOtp({
              email: email.trim(),
              type: "email-verification",
            });
            if (result.error) {
              setError(result.error.message ?? "Could not resend the code.");
            } else {
              setMessage("If this account needs verification, a new code has been sent.");
              setOtp("");
            }
          } catch {
            setError("Could not connect. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Resend code
      </button>
      <p className="text-sm text-center text-stone-500">
        <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
