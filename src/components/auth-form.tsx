"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
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
          const result =
            mode === "register"
              ? await authClient.signUp.email({
                  email,
                  password,
                  name: String(f.get("name")),
                  callbackURL: "/dashboard",
                })
              : mode === "login"
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
          if (result.error) setError(result.error.message ?? "Please try again.");
          else if (mode === "login") {
            router.push("/dashboard");
            router.refresh();
          } else if (mode === "register")
            setMessage("Check your email to verify your account before signing in.");
          else if (mode === "forgot")
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
      {(mode === "register" || mode === "login") && (
        <button
          type="button"
          disabled={busy}
          className="btn btn-outline w-full"
          onClick={async (event) => {
            const form = event.currentTarget.form;
            const email = form ? String(new FormData(form).get("email") ?? "") : "";
            if (!email) {
              setError("Enter your email address first.");
              return;
            }

            setError("");
            setMessage("");
            setBusy(true);
            try {
              const result = await authClient.sendVerificationEmail({
                email,
                callbackURL: "/dashboard",
              });
              if (result.error) {
                setError(
                  result.error.message ?? "Could not send the link. Please try again.",
                );
              } else {
                setMessage(
                  "If this email has an unverified account, a new link has been sent.",
                );
              }
            } catch {
              setError("Could not connect. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Resend verification email
        </button>
      )}
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
