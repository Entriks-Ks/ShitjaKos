# Mobile API

The Next.js server hosts the website and API. Native apps call JSON endpoints under
`/api/v1`. All additions live inside `src/app/api/v1`, including private `_handlers`,
`_shared`, and `_tests` folders. API handlers validate requests and call the existing
services. No existing lib, controller, repository, service, validation, config, or
package files are changed. API-only reads use explicit projections and pagination
through the existing transaction helper. Do not call Server Actions from mobile.

## Authentication

POST JSON to `/api/mobile/auth/:action`. Authentication stays on the existing mobile
endpoint; `/api/v1` contains the application's data and feature endpoints. Use HTTPS
in production. The v1 feature endpoints validate bearer tokens created by the mobile
authentication endpoint without changing website authentication.

| Action          | What it does                                                         | Body                                                               | Important result                              |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| sign-up         | Starts registration and emails a six-digit verification code.        | name, email, password (12–128 characters)                          | `registrationId`; no user exists yet          |
| verify-email    | Checks the code, creates the user, and attempts to sign them in.     | email, code, registrationId, password (optional automatic sign-in) | `token` when automatic sign-in succeeds       |
| resend-code     | Replaces the pending registration code and sends a new email.        | email, registrationId                                              | The same registration remains pending         |
| sign-in         | Checks credentials and creates a mobile session.                     | email, password                                                    | `token` used by protected `/api/v1` endpoints |
| session         | Reads the current mobile session.                                    | `{}` with the current mobile session                               | `session.user` or `null`                      |
| sign-out        | Revokes the current mobile session.                                  | `{}` with the current mobile session                               | `{ok:true}`                                   |
| forgot-password | Sends a six-digit password-reset code when the account can be reset. | email                                                              | `{ok:true,email}`                             |
| reset-password  | Validates the reset code and replaces the password.                  | email, code, password, confirm                                     | `{ok:true}`                                   |

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

## How the mobile app uses the API

### App start

1. Load the saved token from Keychain/Keystore.
2. If there is no token, show the signed-out experience. Public browsing still works.
3. If there is a token, call `GET /api/v1/me` to refresh the account and profile.
4. A `401` means the token is missing, expired, revoked, or invalid. Delete it locally and
   show sign-in. A `403` means the account exists but cannot perform that operation, for
   example because it is suspended or lacks the required role.
5. Load `GET /api/v1/categories` and `GET /api/v1/locations` for listing and search forms.

### Buyer flow

1. Search with `GET /api/v1/listings`.
2. Open one result with `GET /api/v1/listings/:id`.
3. Render its image URLs through `GET /api/v1/media/:mediaId`.
4. Save it with `PUT /api/v1/favorites/:id` or contact the seller with
   `POST /api/v1/conversations`.
5. Continue the chat through `/api/v1/conversations/:id/messages` and mark received
   messages read.

### Seller flow

1. Load categories because their field definitions determine the dynamic form.
2. Create a draft with `POST /api/v1/listings`; retain the returned listing ID.
3. Upload photos one at a time to `/api/v1/listings/:id/media`.
4. Publish with `PUT /api/v1/listings/:id/status` using `{"status":"PUBLISHED"}`.
5. Load `GET /api/v1/listings/:id/edit` before editing. Send its current `version` with
   the complete form to `PUT /api/v1/listings/:id` so stale edits are rejected.

### Business owner flow

1. Create a business with `POST /api/v1/businesses`. It starts in pending review.
2. Read memberships and review state from `GET /api/v1/me/businesses`.
3. An OWNER can edit business settings, invite staff, cancel invitations, and remove
   STAFF. STAFF can manage business inventory according to service permissions but cannot
   edit or delete the business or control its staff.
4. The public shop appears only through the public shop endpoints when existing business
   approval and visibility rules allow it.

## Endpoint reference

`Public` means no token is required. `User` means an active signed-in user. `Owner` means
the listing or business permission check must pass. `Admin` means an active verified global
`ADMIN`; business `OWNER` and `STAFF` are not global admins.

### Account and saved listings

| Method | Path                     | Access | What it does                                                                 | Input / result                                                                             |
| ------ | ------------------------ | ------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/v1/me`             | User   | Loads the signed-in account and its personal profile for the account screen. | Returns identity and profile data without password, session, or account secrets.           |
| PUT    | `/api/v1/me`             | User   | Updates the user's editable profile.                                         | Complete profile body: `name`, `displayName`, `city`, `bio`, `phone`; returns `{ok:true}`. |
| GET    | `/api/v1/me/listings`    | User   | Loads listings the current user may manage for the dashboard.                | `page`, `limit`; returns paginated listing cards, including non-public owned listings.     |
| GET    | `/api/v1/favorites`      | User   | Loads the current user's saved listings.                                     | `page`, `limit`; returns only favorites that are still publicly visible.                   |
| PUT    | `/api/v1/favorites/:id`  | User   | Saves or removes one listing from favorites.                                 | Body `{"saved":true}` or `false`; returns the resulting `saved` value.                     |
| GET    | `/api/v1/me/businesses`  | User   | Loads businesses the user belongs to and their OWNER/STAFF membership role.  | `page`, `limit`; used to choose a business owner when creating inventory.                  |
| GET    | `/api/v1/me/invitations` | User   | Loads pending staff invitations addressed to the verified account email.     | Returns `{items:[...]}` for the invitation inbox.                                          |

### Public discovery

| Method | Path                   | Access | What it does                                                                   | Input / result                                                                                        |
| ------ | ---------------------- | ------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/categories`   | Public | Returns the active category tree and dynamic listing-field definitions.        | Flat `items` array with `parentId`; the app builds groups/subcategories from those relationships.     |
| GET    | `/api/v1/locations`    | Public | Returns the supported countries and their cities for search and listing forms. | Returns `{countries:[...]}` with localized country names and city arrays.                             |
| GET    | `/api/v1/listings`     | Public | Searches public, approved, unexpired listings from active categories/sellers.  | Search filters plus pagination; returns safe listing cards and never exposes a private contact phone. |
| GET    | `/api/v1/listings/:id` | Public | Loads one public listing-detail screen.                                        | Returns description, attributes, seller summary, photos, and phone only when `phoneVisible` is true.  |
| GET    | `/api/v1/media/:id`    | Mixed  | Streams one listing photo.                                                     | Public photos work without auth; authorized owners can also load their private draft photos.          |
| GET    | `/api/v1/shops`        | Public | Lists public shops for the shop directory.                                     | `page`, `limit`; returns paginated shop summaries.                                                    |
| GET    | `/api/v1/shops/:slug`  | Public | Loads a public shop profile and its inventory.                                 | `page`, `limit`; returns business contact details and a nested paginated `listings` result.           |

### Listing management

| Method | Path                                  | Access | What it does                                                                       | Input / result                                                                                        |
| ------ | ------------------------------------- | ------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/listings`                    | User   | Creates a personal or authorized business listing as a draft.                      | Complete listing body; returns `201 {id}`. It refuses a submitted `id` to prevent accidental editing. |
| GET    | `/api/v1/listings/:id/edit`           | Owner  | Loads the complete editable listing, including private drafts and current version. | Returns form values, attributes, media, status, ownership choice, and optimistic-lock `version`.      |
| PUT    | `/api/v1/listings/:id`                | Owner  | Replaces editable listing data after ownership and current-version checks.         | Complete form plus positive integer `version`; returns `{id}` or `409` if another edit won the race.  |
| DELETE | `/api/v1/listings/:id`                | Owner  | Permanently deletes an owned listing and cleans up its stored photos.              | No body; returns `{ok:true}`.                                                                         |
| PUT    | `/api/v1/listings/:id/status`         | Owner  | Moves a listing through its allowed lifecycle.                                     | Body status: `PUBLISHED`, `PAUSED`, `SOLD`, or `CLOSED`; returns `{id,status}`.                       |
| POST   | `/api/v1/listings/:id/media`          | Owner  | Validates, decodes, re-encodes, and attaches one listing photo.                    | Multipart `file`; returns `201 {id}` for the new media record.                                        |
| DELETE | `/api/v1/listings/:id/media/:mediaId` | Owner  | Removes one photo that belongs to the specified listing.                           | No body; returns `{ok:true}`.                                                                         |

### Businesses and staff

| Method | Path                                               | Access       | What it does                                                                                         | Input / result                                                                                                          |
| ------ | -------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/businesses`                               | User         | Creates a business, OWNER membership, shop data, and optional initial branding pending admin review. | Send JSON for details only, or multipart fields with optional `logo` and `background` files; returns `201 {id,images}`. |
| GET    | `/api/v1/businesses/:id`                           | Member       | Loads private business settings plus the caller's membership role.                                   | Returns `404` to non-members so private business existence/details are not exposed.                                     |
| PATCH  | `/api/v1/businesses/:id`                           | OWNER        | Updates business and shop settings.                                                                  | Any supported subset of the business form; returns `{ok:true}`.                                                         |
| DELETE | `/api/v1/businesses/:id`                           | OWNER        | Deletes an eligible empty business after the service checks dependencies.                            | Returns `{ok:true}` or a business-rule error explaining what must be removed first.                                     |
| GET    | `/api/v1/businesses/:id/staff`                     | OWNER        | Loads the staff roster and pending invitations for staff management.                                 | Returns the existing service shape for members and invitations.                                                         |
| POST   | `/api/v1/businesses/:id/invitations`               | OWNER        | Creates or replaces a STAFF invitation and attempts to email it.                                     | Body `{"email":"person@example.com"}`; returns saved invitation data and any mail warning.                              |
| DELETE | `/api/v1/businesses/:id/invitations/:invitationId` | OWNER        | Cancels a pending invitation belonging to that business.                                             | Returns the service result.                                                                                             |
| POST   | `/api/v1/businesses/:id/invitations/:invitationId` | Invited user | Accepts or declines the invitation addressed to the signed-in email.                                 | Body `{"decision":"accept"}` or `{"decision":"decline"}`; acceptance creates a STAFF role.                              |
| DELETE | `/api/v1/businesses/:id/staff/:userId`             | OWNER        | Removes a STAFF member from that business.                                                           | Cannot remove an OWNER; returns the service result.                                                                     |

To create a shop with its initial branding, send `multipart/form-data` to
`POST /api/v1/businesses`. Use the normal business field names and attach either
or both optional files:

- `logo`: JPEG, PNG or WebP, up to 8 MiB; stored as a 512×512 WebP.
- `background`: JPEG, PNG or WebP, up to 8 MiB; stored as a 1600×900 WebP.

The authenticated user becomes the OWNER. The business and both images are
treated as one creation operation: if an image is rejected or cannot be stored,
the newly created empty business is removed so the client can safely retry.
Existing clients may continue sending `application/json` when they do not have
initial images.

### Conversations

| Method | Path                                                   | Access      | What it does                                                                  | Input / result                                                                                 |
| ------ | ------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/conversations`                                | User        | Loads the caller's buyer and seller inbox with unread information.            | `page`; returns the chat inbox and whether another page exists.                                |
| GET    | `/api/v1/notifications`                                | User        | Loads the total unread-message count and the newest unread-message preview.   | Returns `unread` plus `latest`; used for header and account badges without loading the inbox.  |
| POST   | `/api/v1/conversations`                                | Buyer       | Opens or reuses a conversation for one listing and sends its first message.   | `listingId`, `body`, UUID `clientId`; returns `201` with the conversation/message result.      |
| GET    | `/api/v1/conversations/:id/messages`                   | Participant | Loads a conversation and a page of messages visible to the caller.            | Use `before` for older messages or `after` for new messages, never both; returns a `ChatView`. |
| POST   | `/api/v1/conversations/:id/messages`                   | Participant | Sends another message while enforcing block, suspension, and messaging rules. | `body`, UUID `clientId`; retry with the same client ID to prevent duplicate messages.          |
| PUT    | `/api/v1/conversations/:id/read`                       | Participant | Advances the caller's read position without changing the other participant's. | Body `{"sequence":NUMBER}`; returns `{ok:true}`.                                               |
| PUT    | `/api/v1/conversations/:id/block`                      | Participant | Blocks or unblocks the other side for this conversation relationship.         | Body `{"blocked":true}` or `false`; returns `{ok:true}`.                                       |
| POST   | `/api/v1/conversations/:id/messages/:messageId/report` | Participant | Reports a specific message for later moderation/audit handling.               | Body `{"reason":"5 to 1000 characters"}`; returns `{ok:true}`.                                 |

### Administration

| Method | Path                                      | Access | What it does                                                                  | Input / result                                                                                    |
| ------ | ----------------------------------------- | ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/admin/users`                     | Admin  | Searches user accounts for the account-management screen.                     | `q`, `page`; returns 20 users per page and user/business relationship information.                |
| PUT    | `/api/v1/admin/users/:id/suspension`      | Admin  | Suspends or restores one non-protected user account and records the decision. | Body `suspended` and reason; suspended users cannot use protected features.                       |
| GET    | `/api/v1/admin/businesses`                | Admin  | Searches businesses for review and account management.                        | `q`, `page`; returns 20 businesses per page with owner/membership context.                        |
| PUT    | `/api/v1/admin/businesses/:id/suspension` | Admin  | Suspends or restores a business and records the reason.                       | Body `suspended` and reason; suspension hides/restricts business activity through existing rules. |
| GET    | `/api/v1/admin/reviews`                   | Admin  | Loads pending business applications the reviewer is allowed to decide.        | `page`, `limit`; excludes the reviewer's own businesses.                                          |
| PUT    | `/api/v1/admin/businesses/:id/review`     | Admin  | Approves or rejects a pending business and records the decision.              | Body `decision` (`APPROVED`/`REJECTED`) and `reason` (5–1000 characters).                         |
| GET    | `/api/v1/admin/audits`                    | Admin  | Loads the immutable audit trail for administrative investigation.             | `page`, `limit`; returns newest audit events in pages.                                            |
| GET    | `/api/v1/admin/categories`                | Admin  | Loads active and archived taxonomy entries, fields, and usage counts.         | Used by the catalog-management screen; unlike the public endpoint it includes archived entries.   |
| POST   | `/api/v1/admin/categories`                | Admin  | Creates a top-level category or a subcategory.                                | `parentId`, localized `names`, and icon; returns `201 {id}`.                                      |
| PATCH  | `/api/v1/admin/categories/:id`            | Admin  | Archives or restores a category without deleting its historical records.      | Body `{"active":false}` or `true`; returns `{ok:true}`.                                           |
| DELETE | `/api/v1/admin/categories/:id`            | Admin  | Permanently deletes a category only when dependency rules allow it.           | Returns `{ok:true}` or a business-rule error when listings/children prevent deletion.             |
| POST   | `/api/v1/admin/categories/:id/fields`     | Admin  | Adds one to twenty dynamic fields to a subcategory in one request.            | Body `{fields:[...]}`; returns `201 {ids:[...]}`.                                                 |
| DELETE | `/api/v1/admin/fields/:id`                | Admin  | Deletes a dynamic field only when no saved listing answer depends on it.      | Returns `{ok:true}` or a dependency error.                                                        |

Admin authorization is checked from the current database record on every protected call.
There is no admin bypass for private conversations or user-owned listing operations.

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
GET /notifications returns the caller's total unread count and latest unread message.
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
