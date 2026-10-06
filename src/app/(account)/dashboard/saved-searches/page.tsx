import Link from "@/components/navigation-link";
import { Bookmark, Search } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getSavedSearches } from "@/services/saved-searches";
import { savedSearchFilters } from "@/lib/validations/saved-searches";
import { SaveSearchButton } from "@/components/save-search-button";
import {
  DeleteSavedSearch,
  ReadSearchAlerts,
  SavedSearchLiveUpdates,
} from "@/components/saved-search-controls";

export const metadata = {
  title: "Saved searches",
  robots: { index: false, follow: false },
};
export default async function SavedSearchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireUser();
  const raw = await searchParams;
  const page = Math.max(1, Math.min(1000, Math.floor(Number(raw.page)) || 1));
  const data = await getSavedSearches(actor, page);
  return (
    <>
      <SavedSearchLiveUpdates />
      <header className="workspace-heading">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Saved searches</h1>
        <p className="muted">
          Keep your filters. Find new matches without starting again.
        </p>
      </header>
      <div className="saved-search-grid">
        {data.searches.length === 0 && (
          <section className="workspace-card space-y-4">
            <Bookmark size={28} />
            <h2>Your next find starts with a search.</h2>
            <p>Choose your filters on the search page, then select Save search.</p>
            <Link className="btn btn-primary" href="/search">
              Browse listings
            </Link>
          </section>
        )}
        {data.searches.map((search) => (
          <section className="workspace-card space-y-4" key={search.id}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{search.name}</h2>
              <Bookmark size={19} />
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(
                savedSearchFilters.safeParse(search.filters).data ?? {},
              ).map(([key, value]) => (
                <span className="saved-search-tag" key={key}>
                  {
                    (
                      {
                        q: "Search",
                        category: "Category",
                        city: "City",
                        country: "Country",
                        min: "Min €",
                        max: "Max €",
                        condition: "Condition",
                        seller: "Seller",
                        attribute: "Field",
                        value: "Value",
                        intent: "Type",
                      } as Record<string, string>
                    )[key]
                  }
                  : {String(value).replaceAll("_", " ")}
                </span>
              ))}
              {Object.keys(search.filters as object).length === 0 && (
                <span className="saved-search-tag">All listings</span>
              )}
            </div>
            <p className="text-sm text-stone-600">
              {search.frequency === "OFF"
                ? "Alerts off"
                : search.frequency === "DAILY"
                  ? "Daily alerts"
                  : "Weekly alerts"}
            </p>
            {search.lastError && (
              <p role="status" className="notice error">
                {search.lastError}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {search.url && (
                <Link href={search.url} className="btn btn-primary">
                  <Search size={16} />
                  Open results
                </Link>
              )}
              <SaveSearchButton params={{}} existing={search} />
              <DeleteSavedSearch id={search.id} name={search.name} />
            </div>
          </section>
        ))}
      </div>
      <section className="workspace-card mt-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">New matches</h2>
          <ReadSearchAlerts />
        </div>
        {data.alerts.length === 0 && (
          <p className="muted">
            New matches will appear here when your next alert is ready.
          </p>
        )}
        {data.alerts.map((alert) => (
          <article key={alert.id} className="saved-search-alert">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">
                {alert.name}{" "}
                {!alert.read && <span className="saved-search-tag">New</span>}
              </h3>
              <time className="text-xs text-stone-500" dateTime={alert.createdAt}>
                {new Date(alert.createdAt).toLocaleDateString("en-GB", {
                  timeZone: "UTC",
                })}
              </time>
            </div>
            <p className="text-sm text-stone-600">
              {alert.listings.length
                ? `${alert.listings.length} matching listings available`
                : "These listings are no longer available."}
            </p>
            <ul className="space-y-2">
              {alert.listings.map((listing) => (
                <li key={listing.id}>
                  <Link
                    className="underline underline-offset-4"
                    href={`/listings/${listing.id}`}
                  >
                    {listing.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              {alert.url && (
                <Link className="btn btn-outline" href={alert.url}>
                  Open search
                </Link>
              )}
              {!alert.read && <ReadSearchAlerts id={alert.id} />}
            </div>
          </article>
        ))}
        <div className="flex gap-3">
          {page > 1 && (
            <Link className="btn btn-outline" href={`?page=${page - 1}`}>
              Previous alerts
            </Link>
          )}
          {data.hasMore && (
            <Link className="btn btn-outline" href={`?page=${page + 1}`}>
              Older alerts
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
