# Business performance

## Flow

Reads: server page or authenticated v1 GET → performance service → repository → database.
Web/mobile tracking: visible detail screen → v1 POST → service → repository.
Tracking uses a Route Handler to set guest cookies without causing a Server Action
page re-render. Business mutations continue to use their existing Server Actions.

OWNER only, active verified account and non-suspended business. STAFF and unrelated
admins cannot read performance. Tracking verifies the target is public and rejects
all current business members and administrators. Personal listings are not tracked.

## Mobile

GET `/api/v1/businesses/:id/performance?from=2026-09-01&to=2026-09-30`
uses the existing bearer session. Default is 30 UTC days; maximum 366 days.
Returns name, from, to, shopViews, listingViews, favorites, conversations, messages,
daily and popular (ten listings ranked by views).

POST `/api/v1/performance/views` with JSON `{"kind":"listing","id":"listing-id"}`
or `{"kind":"shop","id":"business-id"}`. Send only after a detail screen has been
visible for 1.5 seconds, never on card rendering or prefetch. Signed-in requests
use the existing bearer session. Invalid bearer credentials never fall back to
guest tracking. Duplicate visitor/page/day submissions count once.

Guests can call this endpoint without Authorization. If no valid guest token is
provided, it returns HTTP 202 `{ok:true,retry:true,visitorToken}` and sets the
HttpOnly `sk_performance_visitor` cookie. Web retries once with credentials;
native apps retain `visitorToken` and return it in `X-Performance-Visitor` on the
retry and subsequent views. Tokens expire at UTC midnight and are signed by the
server. Never send account IDs, arbitrary visitor UUIDs or counts. Clear the token
when it expires or tracking is disabled. Guests blocking cookies are not counted
by the web client. Signing in after a guest visit may count twice.

Intake is capped at 600 requests/minute across instances; each account or signed
guest token has a 30/minute budget. Bootstrap requests consume intake too. These
limits are basic cost/abuse bounds, not bot-proof verification. Cookie resets and
multiple issued tokens can inflate counts within the cap. No IP fingerprinting is
used. DNT/GPC requests and obvious bot user agents are skipped. Privacy signals
are preferences, not a substitute for any consent policy required by deployment.
No native app source is included in this repository; the mobile client must call
this endpoint when its screen becomes visible.

## Definitions and privacy

Views: estimated daily unique visitors per page, including guests after this update.
They are not total traffic or unique monthly people. Logged-out sellers may count.
Daily salted HMACs also include business/page, preventing cross-page matching.
No raw user IDs, IPs, user agents, referrers, or message content are stored in views.
Hashes are pseudonymous, not anonymous; access remains server-only. No visitor
records are returned to owners. Receipt hashes are kept for the current and previous
UTC day only; daily aggregates remain until business deletion. The migration
backfills all historical daily totals before receipt cleanup. Counter increments
and deduplication insertions share a transaction through an AFTER INSERT trigger,
so retries cannot inflate totals. This also protects counts from older application
instances during rolling deployment. Keep this trigger when managing the schema;
Prisma db push alone does not create it.

Cleanup runs in bounded batches at most once per minute during tracking traffic.
For cleanup even when there is no traffic, schedule `npm run performance:cleanup`
hourly in the hosting scheduler. The command drains expired receipts and budgets,
never the aggregate counts. No hosting scheduler is installed by this change.
At high volume, increase maintenance frequency if the bounded intake cleanup
cannot drain expired records. Do not describe expiry as guaranteed deletion without
the scheduled job.

Favorites: currently saved favorites created within the range (unsaves/deleted
listings remove them). Inquiries: new conversations. Messages: incoming buyer
messages, including existing conversations. These are not verified sales or a
conversion percentage; anonymous inquiries and views have different coverage.
Historic inquiries/favorites can exist before view tracking was enabled.

## Deployment

Apply the committed migration with `npx prisma migrate deploy`, then regenerate
the client (`npx prisma generate`) and restart. No existing business data changes.
Verify with two accounts: an owner visiting their own pages adds zero; an unrelated
verified user adds one per target/day even after refresh. STAFF cannot GET the
dashboard. Suspended and non-public targets must not be recorded.
