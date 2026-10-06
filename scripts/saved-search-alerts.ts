import "dotenv/config";
import { getPrisma } from "../src/lib/prisma";
import { processSavedSearchAlerts } from "../src/services/saved-searches";
try {
  const result = await processSavedSearchAlerts(100);
  console.log(
    `Saved searches: ${result.processed} checked, ${result.notified} notifications created.`,
  );
} finally {
  await getPrisma().$disconnect();
}
