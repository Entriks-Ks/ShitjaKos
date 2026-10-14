# Saved searches: scheduled polling and email

## Behavior

Instant, Daily and Weekly all create in-app alerts and queue email when new matches
exist. OFF disables both. Empty checks send nothing. Instant is eligible every
15 seconds; actual latency depends on how often the scheduler runs and backlog.
Daily/Weekly use elapsed 24 hours / 7 days, starting when saved or rescheduled.

The shared filter builder enforces public visibility and excludes the subscriber's
own personal/business listings. First-publication timestamps determine eligibility.
Re-enabling starts fresh; changing between enabled frequencies preserves unseen
eligible matches. The unique search/listing match ledger prevents repeat alerts.
Each alert includes at most 100 listings; large backlogs use additional batches.
No PostgreSQL LISTEN connection or separate paid worker is needed for saved searches.
Chat/SSE notifications are unchanged.

## Architecture

Web form -> action -> service -> repository -> database.
Mobile API -> same service. Scheduler endpoint -> same services.
Matching saves alerts, match records and email work in a transaction. SMTP delivery
runs outside transactions with a five-minute claim lease and up to eight attempts.
User eligibility, search frequency and current listing visibility are checked before
email submission. SMTP cannot guarantee exactly-once delivery: provider acceptance
followed by a crash before recording success can cause a duplicate on retry.

## Apply migrations

```powershell
npm run db:deploy
npm run db:generate
```

Restart the web service. The forward rollback migration removes only the Instant
event queue/triggers, preserving saved searches, matches, alerts and pending emails.
Existing Instant searches become due again. Do not delete applied migration history.

## Deployment without a separate worker

Configure an external scheduler to call your existing web service, for example
once per minute (or at the interval your scheduler supports):

- Method: POST
- URL: https://YOUR-DOMAIN/api/cron/saved-searches
- Header: Authorization: Bearer YOUR_RANDOM_SECRET
- Set the identical SAVED_SEARCH_CRON_SECRET on the web service, at least 32 characters.
- Store the secret in scheduler configuration, never a URL or browser code.

Generate a secret locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

No scheduler account/job has been created automatically. Without calls, no matching
or automatic emails occur. A one-minute schedule means approximately minute-scale
Instant alerts, not 15-second delivery. A sleeping or unavailable web service and
provider request timeouts can delay processing; configure scheduler retries.

Each call handles at most ten due searches (with a soft 20-second matching budget)
and two queued emails. This limits request work; more work remains due for later
calls. Individual operations can exceed the soft budget. Monitor overdue searches,
pending email age, response failures and provider timeouts. This is suitable for
small initial traffic, not an unlimited replacement for a worker. Hosting/scheduler
pricing and execution limits depend on the provider and plan.

SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM and BETTER_AUTH_URL must
be configured on the web service. MAIL_MODE=file writes to .local-mail instead of
sending real email. Existing SMTP credentials are reused. Inspect emailAttempts,
emailLastError and emailNextAttemptAt for failures; after eight attempts an operator
must investigate and explicitly reset/requeue. Old alerts are not backfilled.

## Local testing

Run one batch:

```powershell
npm run saved-searches:alerts
```

Or use the optional local polling loop in a second terminal:

```powershell
npm run saved-searches:watch
```

The watch command waits 15 seconds between batches; do not deploy it as a second
service if using the external scheduler. npm run dev alone does not schedule work.

## Verification

```powershell
npx tsx --test tests/saved-searches.test.ts
node --conditions=react-server --import tsx tests/saved-searches.integration.ts
```

Integration tests use an isolated PGlite database, never Supabase. They verify
matching, deduplication, Daily/Weekly/Instant emails with a fake sender, retries,
permissions, deletion, migration rollback and scheduler endpoint authentication.
