-- Existing memberships have no reliable joining timestamp. Restrict existing
-- staff to conversations created from this migration onward; owners keep access.
ALTER TABLE "BusinessMembership"
ADD COLUMN "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
