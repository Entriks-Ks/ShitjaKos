import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { copy, Locale } from "@/lib/catalog";
import { SearchParams, searchUrl } from "@/lib/search-navigation";
import type { searchListings } from "@/repositories/listings";

export function ListingResults({
  result,
  locale,
  params,
  compact = false,
}: {
  result: Awaited<ReturnType<typeof searchListings>>;
  locale: Locale;
  params: SearchParams;
  compact?: boolean;
}) {
  const t = copy[locale];
  const pageUrl = (page: number) => searchUrl(params, { page: String(page) });
  return (
    <>
      {result.items.length ? (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${compact ? "xl:grid-cols-3" : "lg:grid-cols-4"}`}
        >
          {result.items.map((item) => (
            <ListingCard item={item} locale={locale} key={item.id} />
          ))}
        </div>
      ) : (
        <div className="empty">
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
