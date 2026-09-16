ALTER TABLE "Listing" ALTER COLUMN "moderationStatus" SET DEFAULT 'APPROVED';
-- Release existing pending listings without changing their draft/paused/published state.
-- Previously rejected listings remain blocked.
UPDATE "Listing" SET "moderationStatus" = 'APPROVED', "version" = "version" + 1
WHERE "moderationStatus" = 'PENDING';
