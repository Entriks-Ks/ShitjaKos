# Notification SSE

The flow is notification hook → API route → notification service → event repository.
The route authenticates the HTTP request and owns stream headers, heartbeats,
expiry and cleanup. The service checks current messaging eligibility and binds
the subscription to the actor's own inbox. The repository owns PostgreSQL LISTEN
and per-process connection limits. Its database read transaction ends before the
long-lived subscription starts.

Web notification badges use `/api/v1/notifications/stream`. One EventSource is
shared by hook consumers in each browser tab. `ready` and `changed` events trigger
a debounced fetch of the existing authorized notification-summary endpoint.
Normal 15-second polling is removed. An unavailable stream falls back to a
60-second check in visible tabs. The chat thread's own message polling is separate
and is unchanged.

PostgreSQL triggers publish user-specific invalidations after committed message,
read-state, membership, and session-deletion changes. One dedicated LISTEN session
per active application process distributes these events to its local connections.
This works across instances sharing the database; it is not an in-memory-only bus.
No message text or conversation identifiers are transmitted in SSE events.

## Localhost and Render

Run migrations with `npx prisma migrate deploy`, then restart Next.js.
Set `NOTIFICATION_DATABASE_URL` to a PostgreSQL direct or session-mode connection
string. It defaults to the existing `DIRECT_URL`. Never use a transaction-mode
pooler for LISTEN. Keep the URL server-side. Each active instance uses one additional
database connection. Render must run the project as a Node Web Service.

Streams send a heartbeat every 20 seconds without database queries. They expire
after two minutes so reconnects revalidate authentication and fetch a fresh
summary. There are at most five streams per user and 2,000 streams per process.
These are resource limits, not a measured capacity guarantee.

Events are transient: reconnect always refreshes from the database. Network or
database disconnection closes streams and browser EventSource retries. A session
revocation may leave a generic invalidation connection alive until its two-minute
lease expires; all summary fetches recheck current access. Tabs kept open in the
background retain the stream for browser alerts. SSE does not provide push when
the browser is closed. Native mobile clients need their own streaming integration;
their existing summary endpoint continues to work.

Verification: inspect Network for a pending event-stream request, send a message
from another account, and check the badge without refreshing. Reading or deleting
a conversation should update other tabs. Disconnect/reconnect and confirm a fresh
count. Stop streaming and verify slower fallback checks only in visible tabs.

Database triggers require migrations; `prisma db push` does not install them.
