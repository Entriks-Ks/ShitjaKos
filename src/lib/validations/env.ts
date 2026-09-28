import { z } from "zod";

export const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (url) => ["postgres:", "postgresql:"].includes(new URL(url).protocol),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
});

export const objectStorageEnvSchema = z.object({
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET_NAME: z.string().min(1),
});
