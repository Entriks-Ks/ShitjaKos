import Link from "@/components/navigation-link";
import { Search, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
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
  const pageUrl = (page: number) =>
    compact ? searchUrl(params, { page: String(page) }) : homePageUrl(locale, page);
  const remainder = result.items.length % SEARCH_COLUMNS;
  const placeholders =
    compact && result.items.length > 0 && remainder !== 0
      ? SEARCH_COLUMNS - remainder
      : 0;

  const grid = result.items.length ? (
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
  );

  if (compact) {
    return (
      <>
        {grid}
        {result.pages > 1 ? (
          <nav aria-label="Pagination" className="results-pager">
            {result.page > 1 && (
              <Link className="btn btn-outline" href={pageUrl(result.page - 1)}>
                {t.previous}
              </Link>
            )}
            <span className="pill">
              {result.page} / {result.pages}
            </span>
            {result.page < result.pages && (
              <Link className="btn btn-outline" href={pageUrl(result.page + 1)}>
                {t.next}
              </Link>
            )}
          </nav>
        ) : null}
      </>
    );
  }

  const prevBtn =
    result.page > 1 ? (
      <Link
        className="home-results-pager-btn"
        href={pageUrl(result.page - 1)}
        aria-label={t.previous}
      >
        <ChevronLeft size={18} />
      </Link>
    ) : (
      <span className="home-results-pager-btn is-disabled" aria-hidden="true">
        <ChevronLeft size={18} />
      </span>
    );
  const nextBtn =
    result.page < result.pages ? (
      <Link
        className="home-results-pager-btn"
        href={pageUrl(result.page + 1)}
        aria-label={t.next}
      >
        <ChevronRight size={18} />
      </Link>
    ) : (
      <span className="home-results-pager-btn is-disabled" aria-hidden="true">
        <ChevronRight size={18} />
      </span>
    );

  return (
    <div className="home-results-wrap">
      <div className={`home-results-board${result.pages > 1 ? " has-pager" : ""}`}>
        {result.pages > 1 ? prevBtn : null}
        {grid}
        {result.pages > 1 ? nextBtn : null}
      </div>
      {result.pages > 1 ? (
        <p className="home-results-page">
          {result.page} / {result.pages}
        </p>
      ) : null}
    </div>
  );
}

function homePageUrl(locale: Locale, page: number) {
  const params = new URLSearchParams();
  if (locale !== "sq") params.set("lang", locale);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/${query ? `?${query}` : ""}#results`;
}
