"use client";
import { useState } from "react";
import Link from "@/components/navigation-link";
import { authClient } from "@/lib/auth-client";
import { startRegistrationAction } from "@/app/(auth)/register/actions";
import { useRouter } from "next/navigation";
export function AuthForm({
  mode,
  token,
}: {
  mode: "login" | "register" | "forgot" | "reset";
  token?: string;
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const router = useRouter();
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setBusy(true);
        const f = new FormData(e.currentTarget);
        const email = String(f.get("email") ?? "");
        const password = String(f.get("password") ?? "");
        try {
          if (mode === "register") {
            const result = await startRegistrationAction({
              email,
              password,
              name: String(f.get("name") ?? ""),
            });
            if (result.error) setError(result.error);
            else if (result.registrationId) {
              router.push(
                `/verify-email?registration=${encodeURIComponent(result.registrationId)}&email=${encodeURIComponent(email)}`,
              );
            }
            return;
          }
          const result =
            mode === "login"
              ? await authClient.signIn.email({
                  email,
                  password,
                  callbackURL: "/dashboard",
                })
              : mode === "forgot"
                ? await authClient.requestPasswordReset({
                    email,
                    redirectTo: "/reset-password",
                  })
                : await authClient.resetPassword({
                    newPassword: password,
                    token: token ?? "",
                  });
          if (result.error) {
            setError(result.error.message ?? "Please try again.");
            if (mode === "login" && result.error.code === "EMAIL_NOT_VERIFIED") {
              setUnverifiedEmail(email);
            }
          } else if (mode === "login") {
            router.push("/dashboard");
            router.refresh();
          } else if (mode === "forgot")
            setMessage("If an account exists, a password reset message has been sent.");
          else setMessage("Password updated. You can now sign in.");
        } catch {
          setError("Could not connect. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {mode === "register" && (
        <label className="field">
          Your name
          <input name="name" autoComplete="name" required minLength={2} maxLength={100} />
        </label>
      )}
      {mode !== "reset" && (
        <label className="field">
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
      )}
      {mode !== "forgot" && (
        <label className="field">
          Password
          <input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "login" ? 1 : 12}
          />
          {mode !== "login" && <small>At least 12 characters.</small>}
        </label>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {unverifiedEmail && mode === "login" && (
        <Link href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}>
          Enter your verification code
        </Link>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <button disabled={busy} className="btn btn-primary w-full">
        {busy
          ? "Please wait…"
          : {
              login: "Sign in",
              register: "Create account",
              forgot: "Send reset link",
              reset: "Set new password",
            }[mode]}
      </button>
      <div className="text-sm text-center text-stone-500">
        {mode === "login" ? (
          <>
            <Link href="/register">Create an account</Link>
            <span className="mx-2">·</span>
            <Link href="/forgot-password">Forgot password?</Link>
          </>
        ) : (
          <Link href="/login">Back to sign in</Link>
        )}
      </div>
    </form>
  );
}
export function SignOut() {
  const router = useRouter();
  return (
    <button
      className="btn btn-outline"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
