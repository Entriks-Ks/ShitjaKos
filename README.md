# ShitjaKos marketplace

A modular Next.js application with PostgreSQL, Prisma, Better Auth, Tailwind CSS,
and Zod. Personal listings belong to personal profiles; shop inventory belongs
to businesses, and users manage it through business memberships.

## Run this workspace

Use Node.js 24 and open terminals in this directory.

```powershell
npm install
npm run setup:local
```

Start the persistent local development database in one terminal:

```powershell
npm run db:local
```

In another terminal, apply the committed migrations and category seed:

```powershell
npm run db:deploy
npm run db:seed
npm run dev
```

Open http://localhost:3001. Port 3001 keeps this app separate from TROVELA on 3000.
If a ShitjaKos development server is already running, use it rather than starting
another. Prisma's local database retains data between restarts; it is for local
development, not production hosting.

`setup:local` creates `.env` with a random auth secret only when the file does not
already exist. Existing settings are preserved. A hosted PostgreSQL URL can be
used instead; do not run `db:local` in that case.

### Use Supabase instead of the local database

In your existing private `.env`, replace the local `DATABASE_URL` and add
`DIRECT_URL` with the two connection addresses from your Supabase dashboard:

```dotenv
DATABASE_URL="postgresql://postgres.<project-ref>:<encoded-password>@<pooler-host>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<encoded-password>@<pooler-host>:5432/postgres"
```

Use the project-specific username and host Supabase gives you. Replace the
password placeholder with the real database password. If the password contains
characters such as `@`, `#` or `/`, percent-encode those characters in both URLs.
Keep `.env` private; it is ignored by Git. `DATABASE_URL` connects the running
app through the transaction pooler, while Prisma migration commands use the
session pooler in `DIRECT_URL`.

After saving `.env`, run these commands once in this directory, then restart the
app. Supabase will have the project tables and the category definitions:

```powershell
npm run db:deploy
npm run db:seed
npm run dev
```

Use `npm run db:studio` to inspect the tables. Existing accounts and listings in
the local development database do not move to Supabase automatically. Uploaded
images also remain on this computer; the current upload storage needs a durable
volume or object storage for a hosted deployment.

### Add sample listings

Once the tables and categories exist, add 24 sample listings to the database
configured in `.env`:

```powershell
npm run db:seed:demo
```

Refresh the home page to see them. The script fills the existing subcategories,
creates a dedicated demo seller and generates local illustrations in `.uploads/`.
Every title begins with `[Demo]`, and every description explains that the item
is only a sample. The script can be run again without making duplicates. It is
separate from `db:seed`, which defines the catalog and does not create listings.
Demo listings are published directly so they appear in search without an admin
review; seller listings also publish without individual admin approval.

To remove only this script's sample listings, seller and illustrations:

```powershell
npm run db:clear:demo
```

The illustrations live on the computer running the script. If the app runs on
another server, its image storage must be shared or moved to object storage.

## Try the full flow

1. Create an account at `/register`.
2. Open the verification link sent to your email address. With `MAIL_MODE=file`
   during local development, messages are saved as private text files in
   `.local-mail/` instead. That directory is ignored by Git and is never served
   over HTTP.
3. Create a personal draft, choose a subcategory and fill its configured fields.
4. Save the draft, upload photos and click Publish listing.
5. It appears in public search immediately, without an admin review.
6. Create a business from `/business/new`. It is pending until reviewed.
7. After approval, create listings using that business under “Publish as”.
   Your personal listings remain separate from the shop's inventory.

### Review accounts

There are no seeded credentials or automatically privileged users. Register and
verify an account using an email address you can receive, then enter that exact
address to grant admin access:

```powershell
$reviewerEmail = Read-Host "Email of the verified account"
npm run admin:grant -- $reviewerEmail
```

Open `/admin` while signed in as that reviewer. Review new business details,
enter a reason, and approve or reject. Reviewers cannot approve their own businesses. Granting the role is logged. A production staff
console needs MFA and additional operational controls before public launch.

Admins can open `/admin/catalog` from the review queue to add category groups,
subcategories and listing fields. Every name and selection choice has Albanian,
English and German labels. New fields can be required only before a subcategory
has listings; currently one selection field per subcategory can appear as a search
filter. An admin can prepare up to 20 fields for one subcategory and save them in
one transaction; any invalid field rolls back the entire batch. Changes are
validated and logged in the audit history. Admins can archive and restore catalog
categories. Permanent deletion is limited to categories without listings or child
categories and fields without saved answers, which protects existing listing data.
Editing and reordering existing catalog entries are later admin work.

### Database browser

```powershell
npm run db:studio
```

Use migrations for schema changes, not ad-hoc edits to production data:

```powershell
npm run db:migrate -- --name describe_your_change
npm run db:generate
```

## Implemented

- Email/password registration, email verification, login/logout, password reset,
  persistent sessions, auth rate limiting and suspended-account checks.
- Personal profiles, independent businesses, memberships and public shops.
- Manual business review, reasons, self-review prevention, audit log. Listings publish immediately.
- Admin creation of category groups, subcategories and typed listing fields.
- Reference taxonomy: 11 groups and 67 subcategories from
  `Category_Translations_EN_DE (2).pdf`, with its English/German labels and added
  Albanian translations; configured text, number, boolean and select fields.
- Home category tiles open `/search`, with all categories and subcategories in
  a vertical left sidebar and listing cards on the right. Mobile uses an expandable
  category menu. Category changes preserve general filters and reset category-specific
  fields and pagination. Old home-page filter links redirect to the results route.
- For-sale/wanted drafts, edit concurrency checks, submit, pause and sold states.
- Typed category answers checked in services and database triggers; exclusive
  personal/business ownership enforced by a database CHECK constraint.
- 1–12 photos, content validation, pixel and byte limits, rotation/normalization,
  WebP conversion, cover image and individual photo deletion.
- Search by keywords, category/subcategory, city, seller type, price range,
  condition, intent and a configured select attribute; newest/price sorting and
  deterministic pagination within a stable result set.
- Private draft/removed media access control, public phone visibility controls,
  owner dashboard, responsive public pages and error/empty states.
- Consistent multi-line formatting with Prettier.

## Architecture

```text
src/app/(main)/      Public home, shops and listing previews, with a footer layout
src/app/(auth)/      Login, registration and password recovery, with a shared header
src/app/(account)/   Signed-in dashboard and creation pages, guarded by a layout
src/app/(admin)/     Review and catalog screens, guarded by the admin layout
src/app/api/         HTTP handlers for auth and image transfer
src/components/     Reusable UI and interactive forms
src/repositories/   Database read queries for catalog, listings, shops and reviews
src/services/       Validated writes, ownership, state changes, media and reviews
src/lib/            Auth, sessions, permissions, validation and translations
prisma/             Schema, reviewed SQL migrations, taxonomy and seed
scripts/            Local setup, demo inventory and explicit operator role grant
tests/              Domain and isolated database tests
```

Read flow: server page -> repository -> Prisma/PostgreSQL. Write flow: form or
HTTP handler -> authenticated action/route -> service -> authorized transaction.
The route groups organize pages without changing their URLs. Client components
use React hooks for form state, navigation and uploads; server pages read data
directly through repositories instead of adding a client-fetching hook. The
browser cannot assign roles or review states. Listing ownership is immutable
through the listing editor. Edits and photo changes preserve publication without requiring review. Public search and photo access
use the same visibility predicate.

Category answer `value` is a JSON primitive with a declared definition type. Both
Zod/service validation and SQL triggers enforce its type, category and numeric
range or allowed option. Option values remain stable; their translated labels
are configuration. This avoids four competing nullable answer columns.

The category seed is idempotent and contains no fake inventory. It follows the
reference PDF's group order and parent/child structure. Existing category IDs are
retained where possible: DIY uses `power-tools`, Sport & Camping uses `outdoors`,
and their old parent/leaf categories are consolidated in one transaction. Existing
listings and custom field answers are preserved; admin-created categories remain.
Run `npm run db:seed` to apply catalog data changes; no schema migration is needed.
The document specifies category names, not listing fields: existing fields remain,
and admins can configure new fields through `/admin/catalog`. Cordless is optional
now that DIY also covers hand tools. Option labels for proper names are shared
across locales; category labels are translated.

## Verification

With the local app and database running:

```powershell
npm test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Browser tests use the installed Chrome channel and a local file-mail configuration.
They create uniquely named test accounts, exercise both seller types, review,
image authorization, search, shop inventory and suspension, and clean up their
own records. They must only run against an isolated development database.

Format changes with `npm run format`. Generated Prisma files are excluded.

To test catalog creation against the local development database, start `db:local`
and run this in a separate PowerShell terminal. The test refuses hosted database
addresses and removes its temporary records:

```powershell
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
node --conditions=react-server --import tsx tests/catalog.integration.ts
node --conditions=react-server --import tsx tests/media.integration.ts
npx tsx tests/taxonomy.integration.ts
Remove-Item Env:DATABASE_URL
```

The read-only catalog browser checks require the reference catalog and demo listings:

```powershell
npx playwright test tests/e2e/catalog-browse.spec.ts
```

## Configuration and production boundaries

### Loading and performance

Search forms and internal links use client navigation with a thin progress bar.
The current page stays visible during transitions instead of being replaced by
skeleton screens. Server Actions revalidate affected pages and deliver their
updated server content without an additional client refresh. Photo uploads still
refresh once because they use JSON route handlers, not Server Actions.

Account/session reads are shared only within a server render through React `cache`;
roles and suspensions are read again on the next request. Public headers use a small
identity query instead of loading business memberships. Database connections stay
idle for up to 30 seconds for reuse. Search counts and results are fetched concurrently.

Public categories use a five-minute tagged Next data cache. Admin category changes
expire that tag immediately. The raw repository is used for validation and tests;
authorization data is never persisted in this shared cache. External catalog writes
(including seed scripts) become visible after cache revalidation. This project keeps
the classic Next cache model; Cache Components are not enabled.

Listing cards request 480px thumbnails, generated once under `.uploads/thumbnails/`.
Public photo requests use one database visibility query and conditional HTTP caching:
each reuse checks visibility before returning 304. Private previews use `no-store`.
Pausing a listing or suspending its seller therefore prevents anonymous reuse of an
old cached image. Deleting a photo also removes its thumbnail.

Run `npx tsx scripts/measure-public-performance.ts` against a production preview on
port 3002 for read-only timings (override with `PERF_BASE_URL`). The isolated browser
regression suite is `tests/e2e/performance.spec.ts`; it runs only with `PERF_LOCAL=1`,
requires `DATABASE_URL` at localhost:51214, and expects the preview server to use that
same local database and `BETTER_AUTH_URL`. It creates verified temporary accounts
without sending email and cleans up its own fixtures.

### Account and administration

`/dashboard` shows your listings, business memberships, and saved contact details.
Use `/dashboard/profile` to edit your account name, public seller name, city,
bio, and optional phone number. The account phone is private; public contact
visibility is still chosen separately for each listing. Saving a phone number
does not verify it. Email changes are not part of this editor.

`/admin` provides the staff review queue and recent audit activity, with navigation
to `/admin/catalog`. Catalog groups and creation forms expand on demand; item
actions remain in three-dot menus. Existing moderation and deletion protections
still apply. Profile writes validate input and scope updates to the signed-in
user, including a fresh suspension check inside the database transaction.

The phone field requires the `20260916180000_profile_phone` migration. Run
`npm run db:deploy` when deploying this version to another database. The profile
integration check is `node --conditions=react-server --import tsx tests/profile.integration.ts`;
it requires the local test database at localhost:51214 and refuses hosted databases.

See `.env.example`. Real email delivery requires SMTP settings and `MAIL_FROM`.
The file-mail transport refuses to run in production. Configure a production
`BETTER_AUTH_URL`, a strong secret, HTTPS and a managed PostgreSQL database.

For Hostinger Email, use `MAIL_MODE=smtp`, `SMTP_HOST=smtp.hostinger.com`,
`SMTP_PORT=465`, your complete mailbox address as `SMTP_USER`, its mailbox
password as `SMTP_PASSWORD`, and that address in `MAIL_FROM`. Port 465 uses SSL.
Keep the password only in your private `.env`. Registration and password-reset
emails use these settings automatically. The verification links currently point
to `BETTER_AUTH_URL`, so update that URL when hosting the app publicly.

Images currently live in `.uploads/`, outside the public directory. Use a
persistent volume for a single-server deployment; implement object storage
before deploying to ephemeral or multiple application servers. Keep a request
body limit of 9 MB at the reverse proxy as well as application-level checks.

This is the requested accounts/categories/listings/business/search foundation,
not completion of the entire eight-week product brief. Remaining launch work:
phone verification policy and provider; staff MFA; support/report/block and
messaging; favorites; media reordering/crop controls; listing risk automation;
subscription billing; real portal adapters; comprehensive admin tools; full
interface localization; radius/nearest search; full-text relevance tuning;
SEO index strategy; notification/expiry workers; production monitoring and
backup/restore exercises. Contact is currently through explicitly public phone
numbers and approved business contact details.

Email verification is enforced. Phone verification and an identity-verification
badge are not simulated. Business badges mean manual business review only.
Staff roles are USER/ADMIN in this foundation; membership roles are OWNER/MANAGER,
with no public staff-invitation flow yet. Shared ENTRIKS Core can be extracted or
integrated at the module boundaries later.
