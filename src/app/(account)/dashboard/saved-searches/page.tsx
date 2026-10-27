import Link from "@/components/navigation-link";
import { Bell, Bookmark, Clock, Search } from "lucide-react";
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

const filterLabels: Record<string, string> = {
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
};

function frequencyCopy(frequency: string) {
  if (frequency === "OFF") return "Alerts off";
  if (frequency === "INSTANT") return "Instant alerts + email";
  if (frequency === "DAILY") return "Daily alerts + email";
  return "Weekly alerts + email";
}

export default async function SavedSearchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireUser();
  const raw = await searchParams;
  const page = Math.max(1, Math.min(1000, Math.floor(Number(raw.page)) || 1));
  const data = await getSavedSearches(actor, page);
  const unread = data.alerts.filter((alert) => !alert.read).length;
  return (
    <>
      <SavedSearchLiveUpdates />
      <header className="workspace-heading">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Saved searches</h1>
        <p className="muted">
          Keep your filters. New matches show up here without searching again.
        </p>
      </header>

      <section className="saved-search-board">
        <div className="section-heading">
          <div>
            <h2>Your searches</h2>
            <p>
              {data.searches.length}{" "}
              {data.searches.length === 1 ? "search" : "searches"} saved
            </p>
          </div>
          <Link className="btn btn-outline" href="/search">
            <Search size={15} />
            New search
          </Link>
        </div>

        {data.searches.length === 0 ? (
          <div className="saved-search-empty">
            <span className="saved-search-mark" aria-hidden="true">
              <Bookmark size={20} />
            </span>
            <div>
              <h3>Save a search to get alerts.</h3>
              <p>Set your filters on the search page, then tap Save search.</p>
            </div>
            <Link className="btn btn-primary" href="/search">
              Browse listings
            </Link>
          </div>
        ) : (
          <div className="saved-search-list">
            {data.searches.map((search) => {
              const filters =
                savedSearchFilters.safeParse(search.filters).data ?? {};
              const chips = Object.entries(filters);
              return (
                <article className="saved-search-item" key={search.id}>
                  <span
                    className={`saved-search-mark${search.frequency === "OFF" ? " is-off" : ""}`}
                    aria-hidden="true"
                  >
                    {search.frequency === "OFF" ? (
                      <Bookmark size={18} />
                    ) : (
                      <Bell size={18} />
                    )}
                  </span>
                  <div className="saved-search-body">
                    <h2>{search.name}</h2>
                    <div className="saved-search-tags">
                      {chips.length
                        ? chips.map(([key, value]) => (
                            <span className="saved-search-tag" key={key}>
                              {filterLabels[key] ?? key}: {String(value).replaceAll("_", " ")}
                            </span>
                          ))
                        : (
                          <span className="saved-search-tag">All listings</span>
                        )}
                    </div>
                    <p className="saved-search-cadence">
                      <Clock size={13} />
                      {frequencyCopy(search.frequency)}
                    </p>
                    {search.lastError && (
                      <p role="status" className="notice error">
                        {search.lastError}
                      </p>
                    )}
                  </div>
                  <div className="saved-search-actions">
                    {search.url && (
                      <Link href={search.url} className="btn btn-primary">
                        <Search size={15} />
                        Open
                      </Link>
                    )}
                    <SaveSearchButton params={{}} existing={search} />
                    <DeleteSavedSearch id={search.id} name={search.name} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="saved-search-matches">
        <div className="saved-search-matches-head">
          <div>
            <h2>New matches</h2>
            <p>
              {unread
                ? `${unread} unread alert${unread === 1 ? "" : "s"}`
                : "Alerts from your saved searches"}
            </p>
          </div>
          {data.alerts.length > 0 && <ReadSearchAlerts />}
        </div>
        {data.alerts.length === 0 ? (
          <p className="saved-search-matches-empty">
            New listings that match your searches will show up here.
          </p>
        ) : (
          <div className="saved-search-alert-list">
            {data.alerts.map((alert) => (
              <article
                className={`saved-search-alert${alert.read ? "" : " is-new"}`}
                key={alert.id}
              >
                <div className="saved-search-alert-top">
                  <h3>
                    {alert.name}
                    {!alert.read && <span className="saved-search-tag">New</span>}
                  </h3>
                  <time dateTime={alert.createdAt}>
                    {new Date(alert.createdAt).toLocaleDateString("en-GB", {
                      timeZone: "UTC",
                    })}
                  </time>
                </div>
                <p>
                  {alert.listings.length
                    ? `${alert.listings.length} matching listing${alert.listings.length === 1 ? "" : "s"}`
                    : "These listings are no longer available."}
                </p>
                {alert.listings.length > 0 && (
                  <ul className="saved-search-alert-links">
                    {alert.listings.map((listing) => (
                      <li key={listing.id}>
                        <Link href={`/listings/${listing.id}`}>{listing.title}</Link>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="saved-search-alert-actions">
                  {alert.url && (
                    <Link className="btn btn-outline" href={alert.url}>
                      Open search
                    </Link>
                  )}
                  {!alert.read && <ReadSearchAlerts id={alert.id} />}
                </div>
              </article>
            ))}
          </div>
        )}
        {(page > 1 || data.hasMore) && (
          <div className="saved-search-pager">
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
        )}
      </section>
    </>
  );
}
