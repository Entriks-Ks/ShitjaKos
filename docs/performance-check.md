# Performance check

Compared three anonymous browser runs before and after the loading changes, using
the production build on localhost:3002 and the configured Supabase database. Each
run opened the homepage, waited for listing images, then submitted a search.

| Measurement                                         |   Before |    After |
| --------------------------------------------------- | -------: | -------: |
| Document requests per search submission             |        1 |        0 |
| Initial homepage photo bytes                        |  209,684 |   67,516 |
| Repeat homepage photo bytes reported by the browser |  209,684 |        0 |
| First homepage content ready                        | 3,329 ms | 1,615 ms |
| Repeat homepage content ready, mean of two runs     |   493 ms |   496 ms |
| Repeat homepage including photos, mean of two runs  |   832 ms |   528 ms |
| Search content ready, median of three runs          |   467 ms |   401 ms |

These are small local samples, not a load test or a production latency guarantee.
First-run timing includes startup and cache effects. Warm content timings were
effectively unchanged; the clearest improvements are removal of search document
reloads and roughly 68% fewer initial photo bytes. Conditional photo responses still
use network requests and validate visibility, even when no image body is downloaded.

Validation: production build, lint, unit tests, and local media integration checks.
The media checks verify thumbnail sizing, conditional responses, denied anonymous
access after pause/suspension, private owner access, and thumbnail deletion.

Signed-in browser regression tests were added for action refresh counts, profile
saving, category-cache invalidation, role changes, and mobile layout. They could not
be executed in this session because automatic approval review blocked starting the
isolated server with local database/auth settings without providing a reason.

Reproduce anonymous measurements with `npx tsx scripts/measure-public-performance.ts`.
