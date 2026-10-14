import "dotenv/config";
import { setTimeout as delay } from "node:timers/promises";
import { getPrisma } from "../src/lib/prisma";
import {
  processSavedSearchAlerts,
  processSavedSearchEmails,
} from "../src/services/saved-searches";
const watch = process.argv.includes("--watch");
let stopping = false;
const abort = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    stopping = true;
    abort.abort();
  });
try {
  do {
    try {
      const matches = await processSavedSearchAlerts(100);
      const emails = await processSavedSearchEmails(100);
      console.log("Saved searches:", { ...matches, ...emails });
    } catch (error) {
      console.error(
        "Saved-search worker failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      if (!watch) {
        process.exitCode = 1;
        break;
      }
    }
    if (watch && !stopping)
      await delay(15_000, undefined, { signal: abort.signal }).catch(() => {});
  } while (watch && !stopping);
} finally {
  await getPrisma().$disconnect();
}
