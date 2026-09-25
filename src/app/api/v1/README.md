# Mobile API

The Next.js server hosts the website and API. Native apps call JSON endpoints under
`/api/v1`. All additions live inside `src/app/api/v1`, including private `_handlers`,
`_shared`, and `_tests` folders. API handlers validate requests and call the existing
services. No existing lib, controller, repository, service, validation, config, or
package files are changed. API-only reads use explicit projections and pagination
through the existing transaction helper. Do not call Server Actions from mobile.

## Authentication

POST JSON to `/api/v1/auth/:action`. The existing `/api/mobile/auth/:action`
URL is unchanged; new mobile integrations should use v1. Use HTTPS in production.
V1 extends the existing auth configuration with bearer support locally, without
changing the original mobile or website authentication configuration.

| Action          | Body                                                               |
| --------------- | ------------------------------------------------------------------ |
| sign-up         | name, email, password (12–128 characters)                          |
| verify-email    | email, code, registrationId, password (optional automatic sign-in) |
| resend-code     | email, registrationId                                              |
| sign-in         | email, password                                                    |
| session         | {} with Authorization header                                       |
| sign-out        | {} with Authorization header                                       |
| forgot-password | email                                                              |
| reset-password  | email, code, password, confirm                                     |

Registration returns `registrationId`; the user is created only when the code is verified.
Sign-in returns `{ok:true,signedIn:true,token:"..."}`. Store this token in OS secure
storage (Keychain/Keystore), not ordinary app preferences. Send it on protected requests:

```http
Authorization: Bearer YOUR_SESSION_TOKEN
Content-Type: application/json
```

The token is a Better Auth session token, not a JWT. Expiration and revocation are checked
by Better Auth. Sign-out revokes the current session. On 401, clear local auth state
and ask the user to sign in. Current suspension, verification, and admin role are read
from the database on protected requests. Never submit an actor/user role to choose
the acting identity. Business memberships are checked for the specific business.

Native requests need no Origin header or CORS. Browser requests are restricted to
BETTER_AUTH_URL's origin; cross-origin Expo Web is not enabled by these routes.
The website's existing same-origin cookie sessions also work on feature routes.
An invalid bearer never falls back to a valid website cookie.

## Conventions

- Responses are explicit objects, without a universal data envelope. Errors are
  `{error:string}`, with optional validation `issues`.
- 400 malformed input; 401 no valid session; 403 forbidden; 404 missing/private resource;
  409 conflicting update; 413 body too large; 415 wrong content type; 422 business-rule
  refusal; 429 rate limit; 500 unexpected server failure.
- Successful creates return 201. Other successful operations return 200.
  Empty service results become `{ok:true}`.
- JSON request bodies are limited to 64 KiB, including streamed bodies.
- Protected requests have shared database-backed per-user budgets: 240 reads/minute,
  60 writes/minute. Messaging also keeps its existing service quotas.
  Auth has a shared 300 requests/minute budget and 8 requests/minute per email
  for credential/code actions. 429 includes Retry-After: 60.
- Responses use private/no-store, except images which retain visibility-aware caching.
- Most collections accept page (1–1000) and limit (1–50, default 20), returning
  items/page/limit/hasMore. Search returns items/count/page/pages/limit.
  Chat inbox and admin account lists use fixed 20-item pages. Catalog is a full tree
  represented as a flat list with parentId. Staff/invitation lists use existing service shapes.
- Date values are ISO strings. Listing prices in responses are integer euro cents.
- Public listing responses omit internal ownership IDs and storage keys. Contact phone
  is returned only when phoneVisible is true. Approved shop contact information is public.
- Mobile mutations invalidate relevant website caches as well.

## Endpoint inventory

| Method    | Path                                                   |
| --------- | ------------------------------------------------------ |
| GET       | `/api/v1/me`                                           |
| PUT       | `/api/v1/me`                                           |
| GET       | `/api/v1/me/listings`                                  |
| GET       | `/api/v1/me/businesses`                                |
| GET       | `/api/v1/me/invitations`                               |
| GET       | `/api/v1/favorites`                                    |
| PUT       | `/api/v1/favorites/:id`                                |
| GET       | `/api/v1/categories`                                   |
| GET       | `/api/v1/locations`                                    |
| GET       | `/api/v1/listings`                                     |
| POST      | `/api/v1/listings`                                     |
| GET       | `/api/v1/listings/:id`                                 |
| PUT       | `/api/v1/listings/:id`                                 |
| DELETE    | `/api/v1/listings/:id`                                 |
| GET       | `/api/v1/listings/:id/edit`                            |
| PUT       | `/api/v1/listings/:id/status`                          |
| POST      | `/api/v1/listings/:id/media`                           |
| DELETE    | `/api/v1/listings/:id/media/:mediaId`                  |
| GET       | `/api/v1/media/:id`                                    |
| GET       | `/api/v1/shops`                                        |
| GET       | `/api/v1/shops/:slug`                                  |
| POST      | `/api/v1/businesses`                                   |
| GET       | `/api/v1/businesses/:id`                               |
| PATCH     | `/api/v1/businesses/:id`                               |
| DELETE    | `/api/v1/businesses/:id`                               |
| GET       | `/api/v1/businesses/:id/staff`                         |
| DELETE    | `/api/v1/businesses/:id/staff/:userId`                 |
| POST      | `/api/v1/businesses/:id/invitations`                   |
| DELETE    | `/api/v1/businesses/:id/invitations/:invitationId`     |
| POST      | `/api/v1/businesses/:id/invitations/:invitationId`     |
| PUT       | `/api/v1/conversations/:id/read`                       |
| PUT       | `/api/v1/conversations/:id/block`                      |
| POST      | `/api/v1/conversations/:id/messages/:messageId/report` |
| GET       | `/api/v1/admin/users`                                  |
| GET       | `/api/v1/admin/businesses`                             |
| GET       | `/api/v1/admin/reviews`                                |
| GET       | `/api/v1/admin/audits`                                 |
| PUT       | `/api/v1/admin/businesses/:id/review`                  |
| GET       | `/api/v1/admin/categories`                             |
| POST      | `/api/v1/admin/categories`                             |
| PATCH     | `/api/v1/admin/categories/:id`                         |
| DELETE    | `/api/v1/admin/categories/:id`                         |
| POST      | `/api/v1/admin/categories/:id/fields`                  |
| DELETE    | `/api/v1/admin/fields/:id`                             |
| GET, POST | `/api/v1/conversations`                                |
| GET, POST | `/api/v1/conversations/:id/messages`                   |
| PUT       | `/api/v1/admin/users/:id/suspension`                   |
| PUT       | `/api/v1/admin/businesses/:id/suspension`              |

All /admin routes require an active verified global ADMIN, not business OWNER/STAFF.
Audit data is admin-only. No automatic admin bypass exists for private conversations.

## Browse

Public: categories, locations, listings, listing detail, shops and shop detail.
Search parameters: q, category, city, country, seller (private/business/verified),
intent (FOR_SALE/WANTED), condition (NEW/LIKE_NEW/USED/DEFECTIVE/FOR_PARTS),
sort (newest/price-asc/price-desc), min/max (euro decimal strings),
attribute/value, page/limit. Category responses include translated field definitions.
Shop detail includes a paginated listings object.

## Profile and favorites

PUT /me uses the full profile form: name, displayName, city, bio, phone.
GET /me returns account identity and personal profile without session/account secrets.
PUT /favorites/:id uses `{"saved":true}` or false. GET /favorites returns only
currently public saved listings.

## Listing lifecycle

POST /listings creates a draft using this shape:

```json
{
  "owner": "personal",
  "categoryId": "EXISTING_SUBCATEGORY_ID",
  "intent": "FOR_SALE",
  "title": "A comfortable reading chair",
  "description": "A comfortable chair in good condition, available for collection.",
  "price": "45.00",
  "city": "Prishtina",
  "condition": "USED",
  "negotiable": true,
  "phoneVisible": false,
  "contactPhone": "",
  "attributes": {}
}
```

Use a business ID instead of personal to create for a business you belong to.
Fill required attributes by their definition ID using categories data.
POST returns {id}. Upload photos, then PUT /listings/:id/status with
`{"status":"PUBLISHED"}`. Other allowed target values are PAUSED, SOLD, CLOSED;
the existing transition rules still apply.

GET /listings/:id/edit returns the editable payload, photos, and version for authorized
owners/staff only. PUT /listings/:id uses the complete listing form plus version.
A stale version returns 409; reload before retrying. Path IDs override body IDs.
POST /listings refuses an id so it cannot accidentally edit an existing listing.
DELETE /listings/:id applies existing ownership checks and media cleanup.

Photos: POST /listings/:id/media with multipart/form-data field file.
One JPEG/PNG/WebP per request, max 8 MiB; total multipart body max 9 MiB.
The server decodes/re-encodes images and limits decoded pixels and photo count.
DELETE /listings/:id/media/:mediaId removes an image.
GET /media/:id serves an image; optional size=thumb requests a thumbnail.
For private images, send Authorization with the image request. Relative image URLs
in JSON are relative to the API server origin.

## Businesses and invitations

POST /businesses: legalName, publicName, city, phone, email, description, address,
openingHours. Existing validation applies. New businesses remain pending review.
PATCH /businesses/:id accepts a subset of those fields and requires OWNER.
DELETE requires OWNER and an empty business. STAFF cannot change business settings.
GET /me/businesses lists the current user's memberships. GET /businesses/:id is
membership-protected and includes role and business/shop details.

GET /businesses/:id/staff: owner-only roster and pending invitations.
POST /businesses/:id/invitations: `{"email":"person@example.com"}`.
Email delivery warning is returned separately from the saved invitation.
GET /me/invitations: invitations addressed to the current verified email.
POST /businesses/:id/invitations/:invitationId: `{"decision":"accept"}` or decline.
DELETE that path: owner cancellation.
DELETE /businesses/:id/staff/:userId: owner removes STAFF only; cannot remove OWNER.
Role selection never comes from the invitation request.

## Messaging

POST /conversations: listingId, body, clientId (a UUID).
POST /conversations/:id/messages: body, clientId (a UUID).
Retain the same clientId when retrying a message to avoid duplication.
GET /conversations?page=1 returns items/hasMore.
GET /conversations/:id/messages accepts before OR after sequence, never both;
returns the existing ChatView object (messages, hasMore, canSend, etc.).
PUT /conversations/:id/read: `{"sequence":1}`.
PUT /conversations/:id/block: `{"blocked":true}` or false.
POST /conversations/:id/messages/:messageId/report: `{"reason":"..."}` (5–1000 chars).
Only authorized participants/current business members can read or write.
Realtime transport is not added by this API work; the existing polling can be used.

## Administration

GET /admin/users and /admin/businesses accept q/page.
PUT /admin/users/:id/suspension or /admin/businesses/:id/suspension:
`{"suspended":true,"reason":"Reason with at least five characters"}`; false restores.
GET /admin/reviews lists pending businesses excluding the reviewer's own businesses.
PUT /admin/businesses/:id/review: decision (APPROVED/REJECTED), reason (5–1000 chars).
GET /admin/audits is paginated.

GET /admin/categories includes archived entries and field usage counts.
POST /admin/categories: parentId (empty string for a group), names {sq,en,de}, icon.
PATCH /admin/categories/:id: `{"active":false}` (true restores).
DELETE /admin/categories/:id applies dependency checks.
POST /admin/categories/:id/fields: {fields:[...]} (1–20 entries).
Each entry: names {sq,en,de}, type (TEXT/NUMBER/SELECT/BOOLEAN), required,
filterable, unit, min, max, options [{sq,en,de}, ...].
Use null for unused min/max, empty string for unused unit, [] for unused options.
The existing taxonomy rules apply (including required fields on populated categories).
DELETE /admin/fields/:id refuses fields with saved answers.

## React Native example

```ts
const response = await fetch(BASE_URL + "/api/v1/me/listings?page=1", {
  headers: { Authorization: `Bearer ${token}` },
});
const result = await response.json();
if (!response.ok) throw new Error(result.error);
```

BASE_URL must be reachable from the phone. localhost on a physical phone points to
the phone, not your computer. Use the computer's LAN address for local native testing,
and a valid HTTPS deployment in production.

## Deployment and verification

No new database model/migration is needed for the API itself; the previously added
staff migration must already be applied. Existing RateLimit rows store API budgets.
Keep BETTER_AUTH_SECRET stable and BETTER_AUTH_URL correct.
Use a reverse proxy/WAF for public search/image traffic and unauthenticated abuse;
do not trust arbitrary X-Forwarded-For values for IP limits.
Photo storage still uses .uploads, so multiple server instances require shared/object
storage. These APIs do not solve that existing infrastructure limitation.

Run npm test, npm run lint, npm run build, and
`npx tsx --test src/app/api/v1/_tests/security.test.ts`.
Exercise real authenticated flows in a
disposable test database before deploying: two personal accounts, an OWNER, a STAFF
membership, a removed member, and an ADMIN. Verify draft/contact privacy, cross-user
edits, staff restrictions, logout/expiry/suspension, and upload failures.
No production accounts should be created or emails sent as part of automated smoke tests.

For non-mutating HTTP smoke checks, run the built server on port 3007 and run
`node src/app/api/v1/_tests/http-smoke.mjs`. Set API_SMOKE_URL to use another server address. These checks
cover unauthenticated denial, request validation, and public card privacy; they do
not substitute for authenticated integration tests against a disposable database.

Only implemented backend features are exposed. Future payments, saved-search alerts,
ownership transfer, and moderation workflows need their own service implementations
before endpoints can expose them.
