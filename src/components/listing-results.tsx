import Link from "@/components/navigation-link";
import { Search, ArrowRight } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { copy, Locale } from "@/lib/catalog";
import { SearchParams, searchUrl } from "@/lib/search-navigation";
import type { searchListings } from "@/repositories/listings";

const SEARCH_COLUMNS = 3;

export function ListingResults({
  result,
  locale,
  params,
  compact = false,
  viewerSignedIn,
  favoriteIds = [],
}: {
  result: Awaited<ReturnType<typeof searchListings>>;
  locale: Locale;
  params: SearchParams;
  compact?: boolean;
  viewerSignedIn: boolean;
  favoriteIds?: string[];
}) {
  const t = copy[locale];
  const favorites = new Set(favoriteIds);
  const pageUrl = (page: number) => searchUrl(params, { page: String(page) });
  const remainder = result.items.length % SEARCH_COLUMNS;
  const placeholders =
    compact && result.items.length > 0 && remainder !== 0
      ? SEARCH_COLUMNS - remainder
      : 0;

  return (
    <>
      {result.items.length ? (
        <div className={compact ? "search-results-grid" : "home-results-grid"}>
          {result.items.map((item) => (
            <ListingCard
              item={item}
              locale={locale}
              viewerSignedIn={viewerSignedIn}
              saved={favorites.has(item.id)}
              key={item.id}
            />
          ))}
          {Array.from({ length: placeholders }, (_, index) => (
            <div
              key={`placeholder-${index}`}
              className="search-results-placeholder"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : (
        <div className={`empty${compact ? " search-results-empty" : ""}`}>
          <Search size={30} className="mx-auto mb-4 text-stone-400" />
          <h2>{t.empty}</h2>
          <p className="muted mt-2 mb-5">
            Try another category or city, or share the first listing.
          </p>
          <Link href="/listings/new" className="btn btn-primary">
            {t.sell}
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {result.pages > 1 && (
        <nav aria-label="Pagination" className="flex gap-3 justify-center mt-7">
          {result.page > 1 && (
            <Link className="btn btn-outline" href={pageUrl(result.page - 1)}>
              Previous
            </Link>
          )}
          <span className="pill">
            {result.page} / {result.pages}
          </span>
          {result.page < result.pages && (
            <Link className="btn btn-outline" href={pageUrl(result.page + 1)}>
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
