import { getBusinessCategoryOptions } from "@/repositories/businesses";
import { cities } from "@/lib/catalog";
import { shopFilters } from "@/lib/validations/business-categories";
import Link from "@/components/navigation-link";
import Image from "next/image";
import { Store, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import { getPublicShops } from "@/repositories/shops";
import { readShopImageSrc } from "@/services/shop-images";
import { currentActor as currentUser } from "@/lib/session";
import { localeOf } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; q?: string; category?: string; city?: string }>;
}) {
  const query = await searchParams;
  const locale = localeOf(query.lang);
  const filters = shopFilters.parse(query);
  const [user, shops, categories] = await Promise.all([
    currentUser(),
    getPublicShops(filters),
    getBusinessCategoryOptions(),
  ]);
  const labels = {
    sq: {
      query: "Emri i dyqanit",
      queryPlaceholder: "Jam duke kërkuar...",
      category: "Kategoria",
      all: "Të gjitha kategoritë",
      city: "Qyteti",
      cities: "Të gjitha qytetet",
      find: "Gjej dyqane",
      empty: "Asnjë dyqan nuk përputhet me filtrat.",
      clear: "Pastro filtrat",
    },
    en: {
      query: "Shop name",
      queryPlaceholder: "I'm looking for...",
      category: "Category",
      all: "All categories",
      city: "City",
      cities: "All cities",
      find: "Find shops",
      empty: "No shops match these filters.",
      clear: "Clear filters",
    },
    de: {
      query: "Shopname",
      queryPlaceholder: "Ich suche...",
      category: "Kategorie",
      all: "Alle Kategorien",
      city: "Stadt",
      cities: "Alle Städte",
      find: "Shops finden",
      empty: "Keine Shops entsprechen diesen Filtern.",
      clear: "Filter zurücksetzen",
    },
  }[locale];
  const cards = await Promise.all(
    shops.map(async (s) => ({
      ...s,
      logoSrc: await readShopImageSrc("logo", s.logoKey),
    })),
  );
  return (
    <>
      <Header locale={locale} signedIn={!!user} />
      <main className="wrap py-12">
        <p className="eyebrow">BIZNESE NGA KOMUNITETI</p>
        <h1>Local shops. Real people.</h1>
        <p className="muted mb-8">Explore reviewed businesses across Kosovo.</p>
        <form
          action="/shops"
          method="get"
          className="mb-7 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_1fr_1fr_auto]"
        >
          <input type="hidden" name="lang" value={locale} />
          <label className="field">
            {labels.query}
            <input
              key={query.q ?? ""}
              name="q"
              type="search"
              autoComplete="off"
              placeholder={labels.queryPlaceholder}
              defaultValue={query.q ?? ""}
            />
          </label>
          <label className="field">
            {labels.category}
            <select
              key={query.category ?? "all"}
              name="category"
              defaultValue={query.category ?? ""}
            >
              <option value="">{labels.all}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.translations.find((t) => t.locale === locale)?.name ?? c.slug}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {labels.city}
            <select key={query.city ?? "all"} name="city" defaultValue={query.city ?? ""}>
              <option value="">{labels.cities}</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary self-end">{labels.find}</button>
        </form>
        {(filters.q || filters.category || filters.city) && (
          <Link
            className="mb-5 inline-block text-sm underline"
            href={`/shops?lang=${locale}`}
          >
            {labels.clear}
          </Link>
        )}
        {cards.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((s) => (
              <Link className="panel" href={`/shops/${s.slug}?lang=${locale}`} key={s.id}>
                {s.logoSrc ? (
                  <Image
                    unoptimized
                    width={47}
                    height={47}
                    className="shop-list-logo"
                    src={s.logoSrc}
                    alt=""
                  />
                ) : (
                  <Store className="text-emerald-800 mb-5" />
                )}
                <h2>{s.business.publicName}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.business.categories.map((c) => (
                    <span
                      key={c.categoryId}
                      className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
                    >
                      {c.category.translations.find((t) => t.locale === locale)?.name ??
                        c.category.slug}
                    </span>
                  ))}
                </div>
                <p className="muted mt-2 line-clamp-2">{s.business.description}</p>
                <div className="flex justify-between mt-5 text-sm">
                  <span>{s.business.city}</span>
                  <ArrowUpRight size={17} />
                </div>
              </Link>
            ))}
          </div>
        ) : filters.q || filters.category || filters.city ? (
          <div className="empty">
            <h2>{labels.empty}</h2>
          </div>
        ) : (
          <div className="empty">
            <h2>Your neighborhood is growing.</h2>
            <p className="muted my-4">Be one of the first businesses to open a shop.</p>
            <Link className="btn btn-primary" href="/business/new">
              Open a shop
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
