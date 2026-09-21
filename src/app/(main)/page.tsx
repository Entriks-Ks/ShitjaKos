import Link from "@/components/navigation-link";
import Image from "next/image";
import { ListingSearchBar } from "@/components/listing-search-bar";
import { ArrowRight, ShieldCheck, Store, Tag, Users } from "lucide-react";
import { Header } from "@/components/header";
import { ListingResults } from "@/components/listing-results";
import { CategoryIcon } from "@/components/category-icon";
import { redirect } from "next/navigation";
import { searchUrl } from "@/lib/search-navigation";
import { copy, localeOf, translated } from "@/lib/catalog";
import { currentActor as currentUser } from "@/lib/session";
import { getCachedCategories as getCategories } from "@/lib/catalog-cache";
import { searchListings } from "@/repositories/listings";
import { getFavoriteListingIds } from "@/repositories/favorites";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const rawParams = await searchParams;
  const p = Object.fromEntries(
    Object.entries(rawParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  ) as Record<string, string | undefined>;
  if (Object.keys(p).some((key) => key !== "lang" && p[key])) redirect(searchUrl(p));
  const locale = localeOf(p.lang);
  const t = copy[locale];
  if (!process.env.DATABASE_URL)
    return (
      <>
        <Header />
        <main className="wrap py-16">
          <h1>ShitjaKos is almost ready.</h1>
          <p>
            Run npm run setup:local and follow README.md to start your local database.
          </p>
        </main>
      </>
    );
  const [categories, result, user] = await Promise.all([
    getCategories(),
    searchListings(p),
    currentUser(),
  ]);
  const favoriteIds = user
    ? await getFavoriteListingIds(
        user.id,
        result.items.map((item) => item.id),
      )
    : [];
  return (
    <>
      <Header locale={locale} signedIn={!!user} />
      <main className="wrap">
        <div className="home-showcase">
        <section className="hero">
          <div className="hero-art" aria-hidden="true">
            <Image
              src="/images/main-image-made.jpg"
              alt=""
              fill
              preload
              unoptimized
              sizes="(max-width: 767px) 100vw, 1240px"
              className="object-cover"
            />
          </div>
          <h1>
            {t.headline}
            <br />
            <span>{t.subhead}</span>
          </h1>
          <p className="muted max-w-lg">{t.intro}</p>
          <ListingSearchBar locale={locale} categories={categories} params={p} />
          <div className="hero-trust">
            <span>
              <ShieldCheck size={16} strokeWidth={1.8} />
              {t.heroTrust1}
            </span>
            <span>
              <Tag size={16} strokeWidth={1.8} />
              {t.heroTrust2}
            </span>
            <span>
              <Users size={16} strokeWidth={1.8} />
              {t.heroTrust3}
            </span>
          </div>
        </section>
        <section id="categories" className="home-categories-panel">
          <div className="home-categories-head">
            <h2>{t.categories}</h2>
            <p className="home-categories-note">Për çdo ditë. Për këdo.</p>
          </div>
          <div className="home-categories">
            {categories
              .filter((c) => !c.parentId)
              .map((c) => (
                <Link
                  key={c.id}
                  className="category-orb"
                  href={searchUrl({ category: c.id, lang: locale })}
                >
                  <span className="category-orb-icon">
                    <CategoryIcon name={c.icon} size={26} />
                  </span>
                  <span className="category-orb-name">
                    {translated(c.translations, locale)}
                  </span>
                </Link>
              ))}
          </div>
        </section>
        </div>
        <section id="results">
          <div className="flex flex-wrap justify-between gap-3 items-end mb-5">
            <div>
              <p className="eyebrow mb-2">DIÇKA E RE TË PRET</p>
              <h2>{t.latest}</h2>
            </div>
            <span className="text-sm text-stone-500">
              {result.count} {t.results}
            </span>
          </div>
          <ListingResults
            result={result}
            locale={locale}
            params={p}
            viewerSignedIn={!!user}
            favoriteIds={favoriteIds}
          />
        </section>
        <section className="panel shop-cta mt-12 flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Store size={35} />
            <div>
              <h2>{t.shopCtaTitle}</h2>
              <p className="muted">{t.shopCtaText}</p>
            </div>
          </div>
          <Link href="/business/new" className="btn shop-cta-btn">
            {t.shopCtaButton} <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    </>
  );
}
