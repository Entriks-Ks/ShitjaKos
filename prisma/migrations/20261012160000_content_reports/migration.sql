CREATE TABLE "ContentReport" (
 "id" TEXT NOT NULL, "reporterId" TEXT NOT NULL, "targetKind" TEXT NOT NULL,
 "targetId" TEXT NOT NULL, "targetTitle" TEXT NOT NULL, "reason" TEXT NOT NULL,
 "details" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'OPEN',
 "decisionNote" TEXT NOT NULL DEFAULT '', "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ContentReport_target_check" CHECK ("targetKind" IN ('LISTING','BUSINESS')),
 CONSTRAINT "ContentReport_status_check" CHECK ("status" IN ('OPEN','INVESTIGATING','RESOLVED','DISMISSED')),
 CONSTRAINT "ContentReport_reason_check" CHECK ("reason" IN ('SCAM','PROHIBITED','MISLEADING','DUPLICATE','OTHER'))
);
CREATE UNIQUE INDEX "ContentReport_reporterId_targetKind_targetId_key" ON "ContentReport"("reporterId","targetKind","targetId");
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status","createdAt");
CREATE INDEX "ContentReport_targetKind_targetId_idx" ON "ContentReport"("targetKind","targetId");
