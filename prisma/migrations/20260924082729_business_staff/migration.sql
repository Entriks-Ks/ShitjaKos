BEGIN;

-- Rename the existing role without losing memberships.
ALTER TYPE "BusinessRole"
RENAME VALUE 'MANAGER' TO 'STAFF';

-- Preserve the column and remove only its default.
ALTER TABLE "BusinessMembership"
ALTER COLUMN "role" DROP DEFAULT;

CREATE TABLE "BusinessStaffInvitation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessStaffInvitation_pkey"
        PRIMARY KEY ("id")
);

CREATE INDEX "BusinessStaffInvitation_email_expiresAt_idx"
ON "BusinessStaffInvitation"("email", "expiresAt");

CREATE UNIQUE INDEX "BusinessStaffInvitation_businessId_email_key"
ON "BusinessStaffInvitation"("businessId", "email");

ALTER TABLE "BusinessStaffInvitation"
ADD CONSTRAINT "BusinessStaffInvitation_businessId_fkey"
FOREIGN KEY ("businessId")
REFERENCES "Business"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

COMMIT;