# Saved searches and in-app alerts

## User flow

Search results -> Save search -> name + Off/Daily/Weekly -> dashboard Saved searches.
The dashboard supports opening filters, renaming, changing frequency, deleting,
and reading alerts. Filters are immutable after saving: open results, adjust them
and save a new search when you want different criteria. Maximum 30 per account.
The account icon combines chat unread messages and unread search-alert digests;
the Messages navigation badge remains chat-only. No bell is added.

Alerts are durable in-app records. Browser alerts use the existing permission and
SSE connection when the browser is open. Email, web push with the browser closed,
and native push delivery are not part of this implementation.

## Architecture

Web form -> Server Action -> saved-search service -> repositories -> PostgreSQL.
Mobile routes -> same service. Services validate, authenticate against current
user state, check ownership, enforce limits, and manage transactions. The existing
listing repository exports the same filter builder for live search and alerts.

`ListingPublication` is populated by a database trigger on first publication.
Existing published/previously published listings are backfilled during migration.
Republishing doesn't reset that timestamp. The worker matches publications after
search creation (or re-enabling alerts); it excludes the subscriber's personal and
business listings, ineligible/hidden listings and already delivered matches.
Edits to an already delivered listing never generate a second match.
An undelivered publication can match later if it becomes visible or its fields change.

SavedSearchMatch's unique (search, listing) key is the delivery ledger. A worker
locks each user then due search and saves the digest, matches and next run together.
Concurrent workers skip claimed searches. A crash rolls everything back. There is
no moving timestamp cursor to skip a transaction that commits late. Each digest
has at most 100 listings; remaining matches are checked five minutes later.

Frequency is elapsed 24 hours or 7 days, not a local calendar time. First check is
one interval after saving. OFF creates no alerts. Re-enabling starts with new
publications from that point. Renaming preserves the schedule. Changing an active
frequency reschedules the next check without dropping unseen eligible matches.
Removed categories/fields disable alerts with an explanation. Each digest is
rechecked for current public visibility when read. Unavailable listings are omitted.
Existing digests can be marked read even if all their matches were removed.

Suspended/unverified/deleted users are skipped. Permanent account deletion removes
saved searches, their notifications and delivery ledgers. Deleting an individual
saved search does the same and never deletes listings. Retain ledgers while the
search exists: deleting old digests also deletes their deduplication records.

## Database and scheduler

Apply committed migrations (not db push):

```powershell
npm run db:deploy
npm run db:generate
```

Restart the web server. First-publication and notification triggers require the
migration; Prisma generation alone is insufficient.

Run one batch manually:

```powershell
npm run saved-searches:alerts
```

For Render, create a Cron Job against this repository with a schedule such as
`*/5 * * * *` and command `npm run saved-searches:alerts`. Build with `npm ci`.
Provide the same DATABASE_URL as the web service. The CLI does not need an HTTP
endpoint or a public cron secret. Each invocation handles at most 100 due searches.
Monitor `processed`/`notified`, job failures and overdue nextRunAt as traffic grows.
A hosting schedule has NOT been created by this code change. Without scheduling,
filters still work, but automated notifications won't run.

No SMTP is invoked by the worker. Do not describe these records as email delivery.

## Verification

```powershell
npx tsx --test tests/saved-searches.test.ts
node --conditions=react-server --import tsx tests/saved-searches.integration.ts
```

The integration test uses Prisma's installed PGlite packages, applies every
migration to a temporary in-memory database, and connects only to an ephemeral
127.0.0.1 port. It does not read .env or touch Supabase. It checks real repository
queries, filter matching, idempotence, ownership, suspension, disabled filters and
account-deletion cleanup. PGlite serializes connections: production multi-process
lock behavior still warrants a PostgreSQL concurrency test before a large rollout.
