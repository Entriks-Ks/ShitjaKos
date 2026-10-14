CREATE TABLE "SavedSearchEvent" (
 "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 "listingId" TEXT, "searchId" TEXT, "cursor" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', clock_timestamp()),
 CHECK (("listingId" IS NULL) <> ("searchId" IS NULL))
);
CREATE INDEX "SavedSearchEvent_createdAt_id_idx" ON "SavedSearchEvent"("createdAt", "id");
CREATE FUNCTION wake_saved_search_worker() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_notify('shitjakos_saved_searches', 'work');
 RETURN NEW;
END; $$;
CREATE TRIGGER saved_search_event_wake AFTER INSERT ON "SavedSearchEvent"
 FOR EACH ROW EXECUTE FUNCTION wake_saved_search_worker();
CREATE TRIGGER saved_search_email_wake AFTER INSERT ON "SavedSearchAlert"
 FOR EACH ROW EXECUTE FUNCTION wake_saved_search_worker();
CREATE FUNCTION enqueue_saved_search_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status = 'PUBLISHED' THEN
   INSERT INTO "SavedSearchEvent" ("listingId") VALUES (NEW.id);
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER saved_search_publication AFTER INSERT OR UPDATE OF status ON "Listing"
 FOR EACH ROW EXECUTE FUNCTION enqueue_saved_search_publication();
CREATE FUNCTION enqueue_instant_search() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.frequency = 'INSTANT' THEN
   NEW."nextRunAt" := NULL;
   IF TG_OP = 'INSERT' THEN
     INSERT INTO "SavedSearchEvent" ("searchId") VALUES (NEW.id);
   ELSIF OLD.frequency IS DISTINCT FROM NEW.frequency THEN
     INSERT INTO "SavedSearchEvent" ("searchId") VALUES (NEW.id);
   END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER instant_search_enabled BEFORE INSERT OR UPDATE OF frequency ON "SavedSearch"
 FOR EACH ROW EXECUTE FUNCTION enqueue_instant_search();
-- Catch up existing instant subscriptions without replaying delivered matches.
INSERT INTO "SavedSearchEvent" ("searchId") SELECT id FROM "SavedSearch" WHERE frequency = 'INSTANT';
UPDATE "SavedSearch" SET "nextRunAt" = NULL WHERE frequency = 'INSTANT';
