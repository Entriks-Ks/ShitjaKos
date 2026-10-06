CREATE TYPE "SavedSearchFrequency" AS ENUM ('OFF', 'DAILY', 'WEEKLY');
CREATE TABLE "SavedSearch" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "filters" JSONB NOT NULL, "filterVersion" INTEGER NOT NULL DEFAULT 1,
  "filterHash" TEXT NOT NULL, "frequency" "SavedSearchFrequency" NOT NULL DEFAULT 'OFF',
  "eligibleSince" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
  "nextRunAt" TIMESTAMP(3), "lastCheckedAt" TIMESTAMP(3), "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP), "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SavedSearch_userId_filterHash_key" ON "SavedSearch"("userId", "filterHash");
CREATE INDEX "SavedSearch_nextRunAt_idx" ON "SavedSearch"("nextRunAt");
CREATE TABLE "ListingPublication" (
  "listingId" TEXT PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
  CONSTRAINT "ListingPublication_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ListingPublication_createdAt_listingId_idx" ON "ListingPublication"("createdAt", "listingId");
CREATE TABLE "SavedSearchAlert" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "savedSearchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP), "readAt" TIMESTAMP(3),
  CONSTRAINT "SavedSearchAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedSearchAlert_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SavedSearchAlert_userId_readAt_createdAt_idx" ON "SavedSearchAlert"("userId", "readAt", "createdAt");
CREATE TABLE "SavedSearchMatch" (
  "savedSearchId" TEXT NOT NULL, "listingId" TEXT NOT NULL, "alertId" TEXT NOT NULL,
  CONSTRAINT "SavedSearchMatch_pkey" PRIMARY KEY ("savedSearchId", "listingId"),
  CONSTRAINT "SavedSearchMatch_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedSearchMatch_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedSearchMatch_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "SavedSearchAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SavedSearchMatch_alertId_idx" ON "SavedSearchMatch"("alertId");
CREATE INDEX "SavedSearchMatch_listingId_idx" ON "SavedSearchMatch"("listingId");

-- Backfill existing publications so editing/republishing cannot produce a new first publication.
INSERT INTO "ListingPublication" ("listingId", "createdAt")
SELECT "id", COALESCE("publishedAt", "createdAt") FROM "Listing"
WHERE "publishedAt" IS NOT NULL OR "status" IN ('PUBLISHED', 'PAUSED', 'SOLD', 'CLOSED');
CREATE FUNCTION record_first_listing_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'PUBLISHED' THEN
    INSERT INTO "ListingPublication" ("listingId", "createdAt") VALUES (NEW.id, timezone('UTC', clock_timestamp()))
      ON CONFLICT ("listingId") DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER listing_first_publication AFTER INSERT OR UPDATE OF "status" ON "Listing"
FOR EACH ROW EXECUTE FUNCTION record_first_listing_publication();

CREATE FUNCTION notify_saved_search_alert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('shitjakos_notifications', OLD."userId");
    RETURN OLD;
  END IF;
  PERFORM pg_notify('shitjakos_notifications', NEW."userId");
  RETURN NEW;
END;
$$;
CREATE TRIGGER saved_search_alert_changed AFTER INSERT OR UPDATE OR DELETE ON "SavedSearchAlert"
FOR EACH ROW EXECUTE FUNCTION notify_saved_search_alert();
CREATE TRIGGER deleted_user_saved_search BEFORE INSERT OR UPDATE ON "SavedSearch"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_account_child();
CREATE TRIGGER deleted_user_saved_search_alert BEFORE INSERT OR UPDATE ON "SavedSearchAlert"
FOR EACH ROW EXECUTE FUNCTION reject_deleted_account_child();
