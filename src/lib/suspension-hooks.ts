import "server-only";

import { APIError } from "better-auth/api";
import { getPrisma } from "@/lib/prisma";

export const suspensionSessionHooks = {
    create: {
        before: async (session: { userId: string }) => {
            const user = await getPrisma().user.findUnique({
                where: { id: session.userId },
                select: { suspendedAt: true },
            });

            if (!user || user.suspendedAt) {
                throw new APIError("FORBIDDEN", {
                    message: "This account is suspended or unavailable.",
                });
            }
        },
    },
};