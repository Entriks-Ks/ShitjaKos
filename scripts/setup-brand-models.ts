import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedBrandModels } from "../prisma/seed-brand-models";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.table(await db.$transaction(seedBrandModels, { timeout: 120000 }));
} finally {
  await db.$disconnect();
}
