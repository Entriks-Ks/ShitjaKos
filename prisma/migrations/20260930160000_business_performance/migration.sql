CREATE TABLE "BusinessPerformanceView" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "visitorHash" TEXT NOT NULL,
  CONSTRAINT "BusinessPerformanceView_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessPerformanceView_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BusinessPerformanceView_businessId_target_day_visitorHash_key" ON "BusinessPerformanceView"("businessId", "target", "day", "visitorHash");
CREATE INDEX "BusinessPerformanceView_businessId_day_idx" ON "BusinessPerformanceView"("businessId", "day");
