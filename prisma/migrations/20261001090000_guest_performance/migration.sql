BEGIN;
LOCK TABLE "BusinessPerformanceView" IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE "BusinessPerformanceDay" (
  "businessId" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "BusinessPerformanceDay_pkey" PRIMARY KEY ("businessId", "target", "day"),
  CONSTRAINT "BusinessPerformanceDay_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BusinessPerformanceDay_views_check" CHECK ("views" >= 0)
);
CREATE INDEX "BusinessPerformanceDay_businessId_day_idx" ON "BusinessPerformanceDay"("businessId", "day");
CREATE INDEX "BusinessPerformanceView_day_idx" ON "BusinessPerformanceView"("day");
-- Preserve all historical counts before receipts become temporary.
INSERT INTO "BusinessPerformanceDay" ("businessId", "target", "day", "views")
SELECT "businessId", "target", "day", COUNT(*)::integer
FROM "BusinessPerformanceView" GROUP BY "businessId", "target", "day";
-- Keep counters atomic with receipt inserts, including requests from older
-- application instances during a rolling deployment. Duplicate inserts do not fire.
CREATE FUNCTION "incrementBusinessPerformanceDay"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "BusinessPerformanceDay" ("businessId", "target", "day", "views")
  VALUES (NEW."businessId", NEW."target", NEW."day", 1)
  ON CONFLICT ("businessId", "target", "day") DO UPDATE
    SET "views" = "BusinessPerformanceDay"."views" + 1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "businessPerformanceDayIncrement"
AFTER INSERT ON "BusinessPerformanceView"
FOR EACH ROW EXECUTE FUNCTION "incrementBusinessPerformanceDay"();
CREATE TABLE "PerformanceBudget" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "PerformanceBudget_expiresAt_idx" ON "PerformanceBudget"("expiresAt");
COMMIT;
