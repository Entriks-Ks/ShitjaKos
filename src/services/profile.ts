import "server-only";
import { Actor } from "@/lib/permissions";
import { profileInput } from "@/lib/validations/profile";
import { recordAudit } from "@/repositories/audit";
import { withTransaction } from "@/repositories/transaction";
import { findUserStatus, renameUser, upsertPersonalProfile, consumeAccountSecurityAttempt, findActorById } from "@/repositories/users";
import { z } from "zod";
import { getAuth } from "@/lib/auth";

export async function updateProfile(actor: Actor, raw: unknown) {
  if (actor.suspendedAt) throw new Error("This account is suspended.");
  const { name, ...profile } = profileInput.parse(raw);
  return withTransaction(async (tx) => {
    const user = await findUserStatus(tx, actor.id);
    if (!user || user.suspendedAt) throw new Error("Your account is unavailable.");
    await renameUser(tx, actor.id, name);
    await upsertPersonalProfile(tx, actor.id, profile);
    await recordAudit(tx, actor.id, "profile.updated", actor.id, {
      fields: ["name", "displayName", "city", "bio", "phone"],
    });
  });
}

const code = z.string().trim().regex(/^\d{6}$/);



const commandSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("password"),
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128),
  }),

  z.object({
    operation: z.literal("email-current-code"),
  }),

  z.object({
    operation: z.literal("email-new-code"),
    newEmail: z.string().trim().email().max(254),
    currentCode: code,
  }),

  z.object({
    operation: z.literal("email-confirm"),
    newEmail: z.string().trim().email().max(254),
    newCode: code,
  }),

  z.object({
    operation: z.literal("revoke-session"),
    sessionId: z.string().min(1).max(200),
  }),

  z.object({
    operation: z.literal("revoke-other-sessions"),
  }),
]);



async function accountContext(requestHeaders: Headers) {
  const auth = getAuth();

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    throw new Error("Sign in again to manage your account.");
  }

  const actor = await findActorById(session.user.id);

  if (!actor || actor.suspendedAt) {
    throw new Error("This account is unavailable.");
  }

  return { auth, session };
}






export async function getAccountSecurity(
  requestHeaders: Headers,
) {
  const { auth, session } = await accountContext(requestHeaders);

  const sessions = await auth.api.listSessions({
    headers: requestHeaders,
  });

  return {
    email: session.user.email,

    // Never pass session tokens into page props.
    sessions: sessions.map((item) => ({
      id: item.id,
      current: item.id === session.session.id,
      userAgent: item.userAgent || "Unknown browser or device",
      createdAt: item.createdAt.toISOString(),
      expiresAt: item.expiresAt.toISOString(),
    })),
  };
}




export async function changeAccountSecurity(
  requestHeaders: Headers,
  raw: unknown,
) {
  const input = commandSchema.parse(raw);
  const { auth, session } = await accountContext(requestHeaders);

  const allowed = await consumeAccountSecurityAttempt(
    session.user.id,
    input.operation,
  );

  if (!allowed) {
    throw new Error("Too many attempts. Wait a minute and try again.");
  }

  switch (input.operation) {
    case "password": {
      if (input.newPassword !== input.confirmPassword) {
        throw new Error("The new passwords do not match.");
      }

      await auth.api.changePassword({
        headers: requestHeaders,
        body: {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
          revokeOtherSessions: true,
        },
      });

      return "Password changed. Other sessions have been signed out.";
    }

    case "email-current-code": {
      await auth.api.sendVerificationOTP({
        headers: requestHeaders,
        body: {
          // The server chooses this address from the session.
          email: session.user.email,
          type: "email-verification",
        },
      });

      return "A verification code was sent to your current email.";
    }

    case "email-new-code": {
      await auth.api.requestEmailChangeEmailOTP({
        headers: requestHeaders,
        body: {
          newEmail: input.newEmail,
          otp: input.currentCode,
        },
      });

      // Better Auth deliberately avoids revealing whether an
      // address already belongs to another account.
      return (
        "If the new address is available, a code has been sent to it. " +
        "Your current email has not changed."
      );
    }

    case "email-confirm": {
      await auth.api.changeEmailEmailOTP({
        headers: requestHeaders,
        body: {
          newEmail: input.newEmail,
          otp: input.newCode,
        },
      });

      return "Your new email address is verified and saved.";
    }

    case "revoke-session": {
      // Resolve the token on the server, using only this user's sessions.
      const sessions = await auth.api.listSessions({
        headers: requestHeaders,
      });

      const target = sessions.find(
        (item) => item.id === input.sessionId,
      );

      if (!target) {
        return "That session has already ended.";
      }

      if (target.id === session.session.id) {
        throw new Error(
          "Use the normal sign-out button for your current session.",
        );
      }

      await auth.api.revokeSession({
        headers: requestHeaders,
        body: {
          token: target.token,
        },
      });

      return "The selected session has been signed out.";
    }

    case "revoke-other-sessions": {
      await auth.api.revokeOtherSessions({
        headers: requestHeaders,
      });

      return "All other sessions have been signed out.";
    }
  }
}

