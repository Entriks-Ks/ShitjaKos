import "server-only";
import { createHash } from "node:crypto";
import { withTransaction } from "@/repositories/transaction";
import { findChatActor } from "@/repositories/messaging";

export function findApiUser(id: string) {
  return withTransaction((tx) => findChatActor(tx, id));
}
// One reusable row per actor and bucket; a fixed window, shared across instances.
export async function consumeApiBudget(userId: string, write: boolean, maximum?: number) {
  const key = `api:${write ? "write" : "read"}:${createHash("sha256").update(userId).digest("hex")}`;
  const max = maximum ?? (write ? 60 : 240);
  const rows = await withTransaction(
    (tx) => tx.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("id", "key", "count", "lastRequest")
    VALUES (${key}, ${key}, 1, (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."lastRequest" < (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint - 60000 THEN 1 ELSE "RateLimit"."count" + 1 END,
      "lastRequest" = CASE WHEN "RateLimit"."lastRequest" < (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint - 60000 THEN (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint ELSE "RateLimit"."lastRequest" END
    WHERE "RateLimit"."count" < ${max} OR "RateLimit"."lastRequest" < (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint - 60000
    RETURNING "count"
  `,
  );
  return rows.length > 0;
}
