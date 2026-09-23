import Link from "@/components/navigation-link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/header";
import { CategorySidebar } from "@/components/category-sidebar";
import { SearchFilters } from "@/components/search-filters";
import { ListingResults } from "@/components/listing-results";
import { ListingSearchBar } from "@/components/listing-search-bar";
import { copy, localeOf, translated } from "@/lib/catalog";
import { legacyCategories, searchUrl } from "@/lib/search-navigation";
import { currentActor as currentUser } from "@/lib/session";
import { getCachedCategories as getCategories } from "@/lib/catalog-cache";
import { searchListings } from "@/repositories/listings";
import { getFavoriteListingIds } from "@/repositories/favorites";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  if (params.category && legacyCategories[params.category]) {
    redirect(
      searchUrl(params, {
        category: legacyCategories[params.category],
        page: undefined,
        attribute: undefined,
        value: undefined,
      }),
    );
  }
  const locale = localeOf(params.lang);
  const t = copy[locale];
  const [categories, result, user] = await Promise.all([
    getCategories(),
    searchListings(params, 15),
    currentUser(),
  ]);
  const favoriteIds = user
    ? await getFavoriteListingIds(
        user.id,
        result.items.map((item) => item.id),
      )
    : [];
  const selected = categories.find((category) => category.id === params.category);
  const parent = categories.find((category) => category.id === selected?.parentId);
  const title = params.q
    ? `${t.search}: “${params.q}”`
    : selected
      ? translated(selected.translations, locale)
      : t.latest;
  return (
    <>
      <Header locale={locale} signedIn={!!user} />
      <section className="search-banner">
        <div className="wrap">
          <ListingSearchBar
            locale={locale}
            categories={categories}
            params={params}
            className="searchbar searchbar-banner"
          />
        </div>
      </section>
      <main className="wrap search-page">
        <nav aria-label="Breadcrumb" className="search-breadcrumb">
          <Link href={`/?lang=${locale}`}>ShitjaKos</Link>
          <ChevronRight size={13} />
          <Link href={`/search?lang=${locale}`}>{t.search}</Link>
          {parent && (
            <>
              <ChevronRight size={13} />
              <Link href={searchUrl({ lang: locale, category: parent.id })}>
                {translated(parent.translations, locale)}
              </Link>
            </>
          )}
          {selected && (
            <>
              <ChevronRight size={13} />
              <span aria-current="page">{translated(selected.translations, locale)}</span>
            </>
          )}
        </nav>
        <div className="search-layout">
          <CategorySidebar categories={categories} params={params} locale={locale} />
          <section id="results" className="search-results">
            <div className="search-results-heading">
              <h1 className="mb-0">{title}</h1>
              <div className="search-results-heading-tools">
                <span className="text-sm text-stone-500">
                  {result.count} {t.results}
                </span>
                <SearchFilters params={params} locale={locale} selected={selected} />
              </div>
            </div>
            <ListingResults
              result={result}
              locale={locale}
              params={params}
              compact
              viewerSignedIn={!!user}
              favoriteIds={favoriteIds}
            />
          </section>
        </div>
      </main>
    </>
  );
}
