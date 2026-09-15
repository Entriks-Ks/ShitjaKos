import { z } from "zod";

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.url().refine(
    (url) => ["postgres:", "postgresql:"].includes(new URL(url).protocol),
    "DATABASE_URL must be a PostgreSQL connection string",
  ),
});
