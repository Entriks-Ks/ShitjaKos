ALTER TYPE "SavedSearchFrequency" ADD VALUE 'INSTANT';
ALTER TABLE "SavedSearchAlert"
 ADD COLUMN "emailNextAttemptAt" TIMESTAMP(3),
 ADD COLUMN "emailAttempts" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "emailLeaseToken" TEXT,
 ADD COLUMN "emailSentAt" TIMESTAMP(3),
 ADD COLUMN "emailLastError" TEXT;
CREATE INDEX "SavedSearchAlert_emailNextAttemptAt_idx" ON "SavedSearchAlert"("emailNextAttemptAt");
