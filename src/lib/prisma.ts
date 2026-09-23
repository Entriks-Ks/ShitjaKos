import "server-only";
import { SerialPrismaPg } from "@/lib/serial-prisma-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseEnvSchema } from "@/lib/validations/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Initialize only when a database operation is requested, so the starter can
// build and render before a database connection has been configured.
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const result = databaseEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });
  if (!result.success) {
    throw new Error(
      "Set DATABASE_URL to a valid PostgreSQL URL in .env before using the database.",
    );
  }

  const adapter = new SerialPrismaPg({
    connectionString: result.data.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  globalForPrisma.prisma = new PrismaClient({ adapter });
  return globalForPrisma.prisma;
}
