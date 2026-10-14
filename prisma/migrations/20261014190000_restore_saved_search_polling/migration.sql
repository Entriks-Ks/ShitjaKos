-- Preserve searches, matches, in-app alerts and the email outbox.
DROP TRIGGER IF EXISTS saved_search_publication ON "Listing";
DROP TRIGGER IF EXISTS instant_search_enabled ON "SavedSearch";
DROP TRIGGER IF EXISTS saved_search_email_wake ON "SavedSearchAlert";
DROP TRIGGER IF EXISTS saved_search_event_wake ON "SavedSearchEvent";
DROP FUNCTION IF EXISTS enqueue_saved_search_publication();
DROP FUNCTION IF EXISTS enqueue_instant_search();
DROP FUNCTION IF EXISTS wake_saved_search_worker();
DROP TABLE IF EXISTS "SavedSearchEvent";
-- Recheck from the existing eligibility boundary; the match ledger prevents duplicates.
UPDATE "SavedSearch" SET "nextRunAt" = timezone('UTC', clock_timestamp())
WHERE frequency = 'INSTANT';
