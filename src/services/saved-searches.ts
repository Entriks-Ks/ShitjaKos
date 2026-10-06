import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Actor } from "@/lib/permissions";
import {
  createSavedSearchInput,
  updateSavedSearchInput,
  savedSearchFilters,
  savedSearchId,
  nextSavedSearchRun,
} from "@/lib/validations/saved-searches";
import { withTransaction } from "@/repositories/transaction";
import { consumeAccountSecurityAttempt } from "@/repositories/users";
import * as records from "@/repositories/saved-searches";
import { searchUrl } from "@/lib/search-navigation";

export class SavedSearchError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
type Tx = Parameters<Parameters<typeof withTransaction>[0]>[0];
async function activeUser(tx: Tx, actor: Actor, write = false) {
  const user = await records.lockSavedSearchUser(tx, actor.id, write);
  if (!user || user.suspendedAt || user.deletedAt || !user.emailVerified)
    throw new SavedSearchError("An active, verified account is required.", 403);
  return user;
}
async function budget(actor: Actor) {
  if (!(await consumeAccountSecurityAttempt(actor.id, "saved-searches")))
    throw new SavedSearchError("Too many changes. Wait a minute and retry.", 429);
}
function searchDto(
  row: NonNullable<Awaited<ReturnType<typeof records.findSavedSearch>>>,
) {
  const parsed = savedSearchFilters.safeParse(row.filters);
  return {
    id: row.id,
    name: row.name,
    filters: row.filters,
    frequency: row.frequency,
    lastError:
      row.lastError ??
      (parsed.success ? null : "These filters need updating. Create a new saved search."),
    nextRunAt: row.nextRunAt?.toISOString() ?? null,
    url: parsed.success ? searchUrl(parsed.data) : null,
    createdAt: row.createdAt.toISOString(),
  };
}
export async function createSavedSearch(actor: Actor, raw: unknown) {
  const input = createSavedSearchInput.parse(raw);
  await budget(actor);
  return withTransaction(async (tx) => {
    await activeUser(tx, actor, true);
    if (!(await records.searchCatalogValid(tx, input.filters)))
      throw new SavedSearchError(
        "The selected category or field is no longer available.",
      );
    const filterHash = createHash("sha256")
      .update(JSON.stringify(input.filters))
      .digest("hex");
    if (await records.findDuplicateSearch(tx, actor.id, filterHash))
      throw new SavedSearchError(
        "You already saved these filters. Manage them in Saved searches.",
        409,
      );
    if ((await records.countSavedSearches(tx, actor.id)) >= 30)
      throw new SavedSearchError("You can save up to 30 searches. Delete one first.");
    const now = await records.savedSearchClock(tx);
    return searchDto(
      await records.insertSavedSearch(tx, {
        userId: actor.id,
        name: input.name,
        filters: input.filters,
        filterHash,
        frequency: input.frequency,
        nextRunAt: nextSavedSearchRun(input.frequency, now),
        eligibleSince: now,
      }),
    );
  });
}
export async function updateSavedSearch(actor: Actor, id: string, raw: unknown) {
  savedSearchId.parse(id);
  const input = updateSavedSearchInput.parse(raw);
  await budget(actor);
  return withTransaction(async (tx) => {
    await activeUser(tx, actor, true);
    const current = await records.findSavedSearch(tx, actor.id, id);
    if (!current) throw new SavedSearchError("Saved search not found.", 404);
    if (
      !(await records.searchCatalogValid(
        tx,
        savedSearchFilters.parse(current.filters),
      )) &&
      input.frequency !== "OFF"
    )
      throw new SavedSearchError(
        "This category or field was removed. Create a new search with updated filters.",
      );
    const now = await records.savedSearchClock(tx);
    const changed = input.frequency !== current.frequency;
    return searchDto(
      await records.updateSavedSearchRecord(tx, id, {
        ...input,
        lastError: input.frequency === "OFF" ? current.lastError : null,
        ...(changed ? { nextRunAt: nextSavedSearchRun(input.frequency, now) } : {}),
        // Enabling alerts starts fresh; it does not email/notify about the off period.
        ...(current.frequency === "OFF" && input.frequency !== "OFF"
          ? { eligibleSince: now }
          : {}),
      }),
    );
  });
}
export async function deleteSavedSearch(actor: Actor, id: string) {
  savedSearchId.parse(id);
  await budget(actor);
  return withTransaction(async (tx) => {
    await activeUser(tx, actor, true);
    if (!(await records.removeSavedSearch(tx, actor.id, id)).count)
      throw new SavedSearchError("Saved search not found.", 404);
    return { deleted: true };
  });
}
export async function getSavedSearches(actor: Actor, page = 1) {
  z.number().int().min(1).max(1000).parse(page);
  return withTransaction(async (tx) => {
    await activeUser(tx, actor);
    const searches = await records.listSavedSearchRecords(tx, actor.id);
    const alerts = await records.listSavedSearchAlerts(tx, actor.id, page);
    return {
      searches: searches.map(searchDto),
      hasMore: alerts.length > 20,
      alerts: alerts.slice(0, 20).map((alert) => ({
        id: alert.id,
        name: alert.savedSearch.name,
        read: !!alert.readAt,
        createdAt: alert.createdAt.toISOString(),
        url: (() => {
          const parsed = savedSearchFilters.safeParse(alert.savedSearch.filters);
          return parsed.success ? searchUrl(parsed.data) : null;
        })(),
        listings: alert.matches.map((match) => match.listing),
      })),
    };
  });
}
export async function markSavedSearchRead(actor: Actor, id?: string) {
  if (id) savedSearchId.parse(id);
  return withTransaction(async (tx) => {
    await activeUser(tx, actor);
    await records.markSavedSearchAlertsRead(tx, actor.id, id);
    return { read: true };
  });
}
export async function getSavedSearchNotificationSummary(actor: Actor) {
  return withTransaction(async (tx) => {
    await activeUser(tx, actor);
    return records.savedSearchAlertSummary(tx, actor.id);
  });
}

// Run from a scheduled job, never from publication or a public request.
export async function processSavedSearchAlerts(limit = 100) {
  const due = await records.dueSavedSearches(limit);
  let processed = 0,
    notified = 0;
  for (const item of due) {
    await withTransaction(
      async (tx) => {
        const user = await records.lockSavedSearchUser(tx, item.userId);
        if (!user || user.suspendedAt || user.deletedAt || !user.emailVerified) return;
        const search = await records.claimDueSearch(tx, item.id, item.userId);
        if (!search) return;
        const parsed = savedSearchFilters.safeParse(search.filters);
        if (
          search.filterVersion !== 1 ||
          !parsed.success ||
          !(await records.searchCatalogValid(tx, parsed.data))
        ) {
          await records.updateSavedSearchRecord(tx, search.id, {
            frequency: "OFF",
            nextRunAt: null,
            lastError: "Filters changed or are unavailable. Create a new saved search.",
          });
          processed++;
          return;
        }
        const matches = await records.findNewSearchMatches(tx, search, parsed.data);
        if (matches.length) {
          await records.insertSavedSearchAlert(
            tx,
            search,
            matches.slice(0, 100).map((row) => row.id),
          );
          notified++;
        }
        const now = await records.savedSearchClock(tx);
        await records.updateSavedSearchRecord(tx, search.id, {
          lastCheckedAt: now,
          lastError: null,
          nextRunAt:
            matches.length > 100
              ? new Date(now.getTime() + 300_000)
              : nextSavedSearchRun(search.frequency, now),
        });
        processed++;
      },
      { timeout: 20_000 },
    );
  }
  return { processed, notified };
}
