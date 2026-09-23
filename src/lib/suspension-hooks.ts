import "server-only";

import { APIError } from "better-auth/api";
import { findUserSuspension } from "@/repositories/users";

export const suspensionSessionHooks = {
  create: {
    before: async (session: { userId: string }) => {
      const user = await findUserSuspension(session.userId);

      if (!user || user.suspendedAt) {
        throw new APIError("FORBIDDEN", {
          message: "This account is suspended or unavailable.",
        });
      }
    },
  },
};
