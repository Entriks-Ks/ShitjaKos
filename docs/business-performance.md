# Business performance

## Flow

Reads: server page or authenticated v1 GET → performance service → repository → database.
Web tracking: visible page client component → Server Action → service → repository.
Mobile tracking: authenticated v1 POST → same service → repository.

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
visible, never on card rendering or prefetch. Uses existing API authentication and
rate limiting. Duplicate signed-in visitor/page/day submissions count once.
No native app source is included in this repository; the mobile client must call
this endpoint when its screen becomes visible.

## Definitions and privacy

Views: signed-in visitors per page per UTC day, starting with feature deployment.
Anonymous visits are excluded; these are not total traffic or unique monthly people.
Daily salted HMACs also include business/page, preventing cross-page matching.
No raw user IDs, IPs, user agents, referrers, or message content are stored in views.
Hashes are pseudonymous, not anonymous; access remains server-only. No visitor
records are returned to owners. Records currently remain until business deletion;
define and operate a retention policy before long-term production collection.

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
