import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
async function grantAdmin(email: string) {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
  });

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(
        `No account exists for ${email} in the current database. Register and verify it first, or use the email of an existing account.`,
      );
    }
    if (!user.emailVerified || user.suspendedAt) {
      throw new Error(
        "Account must be verified and active before granting admin access.",
      );
    }
    if (user.role === "ADMIN") {
      console.log("This account already has admin access.");
      return;
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          action: "admin.granted-via-operator-cli",
          targetId: user.id,
          detail: { mechanism: "local operator" },
        },
      });
    });
    console.log("Admin access granted to the specified existing account.");
  } finally {
    await db.$disconnect();
  }
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin:grant -- existing-account@email.com");
  process.exitCode = 1;
} else {
  grantAdmin(email).catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Could not grant admin access.",
    );
    process.exitCode = 1;
  });
}
