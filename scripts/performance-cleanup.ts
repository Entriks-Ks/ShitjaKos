import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";
import { maintainPerformance } from "../src/services/business-performance";
try {
  // Drain bounded batches. Daily aggregates are never deleted by this job.
  let result;
  do {
    result = await maintainPerformance();
  } while (result.receipts === 5000 || result.budgets === 5000);
  console.log("Expired performance identifiers and rate limits cleaned up.");
} finally {
  await getPrisma().$disconnect();
}
