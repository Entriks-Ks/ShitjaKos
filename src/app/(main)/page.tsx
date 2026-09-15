import Link from "next/link";
import {
  Armchair,
  Laptop,
  Search,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Header } from "@/components/header";
import { ListingResults } from "@/components/listing-results";
import { CategoryIcon } from "@/components/category-icon";
import { redirect } from "next/navigation";
import { searchUrl } from "@/lib/search-navigation";
import { cities, copy, localeOf, translated } from "@/lib/catalog";
import { currentUser } from "@/lib/session";
import { getCategories } from "@/repositories/catalog";
import { searchListings } from "@/repositories/listings";
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
  return (
    <>
      <Header locale={locale} signedIn={!!user} />
      <main className="wrap">
        <section className="hero">
          <div className="hero-art" aria-hidden="true">
            <div className="art-block bg-[#c4d698] w-32 h-36 right-0 top-3">
              <Armchair size={70} />
            </div>
            <div className="art-block bg-[#f8f5e8] w-32 h-28 left-0 top-20">
              <Laptop size={65} />
            </div>
          </div>
          <p className="eyebrow">TREGU YT LOKAL · KOSOVË</p>
          <h1>
            {t.headline}
            <br />
            <span>{t.subhead}</span>
          </h1>
          <p className="muted max-w-lg">{t.intro}</p>
          <form className="searchbar" action="/search">
            <input type="hidden" name="lang" value={locale} />
            <div className="hidden sm:flex items-center pl-3">
              <Search size={19} />
            </div>
            <input
              name="q"
              aria-label={t.query}
              placeholder={t.query}
              defaultValue={p.q}
            />
            <select name="city" aria-label={t.location} defaultValue={p.city ?? ""}>
              <option value="">Gjithë Kosova · All cities</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit">
              <Search size={17} />
              {t.search}
            </button>
          </form>
          <div className="flex flex-wrap gap-5 mt-5 text-[11px] text-stone-600">
            <span className="flex items-center gap-1">
              <MapPin size={13} /> Prishtina · Prizren · Ferizaj
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} /> Shpallje të kontrolluara
            </span>
          </div>
        </section>
        <section id="categories" className="py-9">
          <div className="flex justify-between items-center mb-5">
            <h2>{t.categories}</h2>
            <span className="text-xs text-stone-400">Për çdo ditë. Për këdo.</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories
              .filter((c) => !c.parentId)
              .map((c) => {
                return (
                  <Link
                    key={c.id}
                    className="category-tile"
                    href={searchUrl({ category: c.id, lang: locale })}
                  >
                    <span className="category-icon">
                      <CategoryIcon name={c.icon} size={21} />
                    </span>
                    <span>{translated(c.translations, locale)}</span>
                  </Link>
                );
              })}
          </div>
        </section>
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
          <ListingResults result={result} locale={locale} params={p} />
        </section>
        <section className="panel mt-12 flex flex-wrap items-center justify-between gap-5 bg-[#f0f4e9]">
          <div className="flex items-center gap-4">
            <Store size={35} className="text-emerald-800" />
            <div>
              <h2>Biznesi yt, më afër klientëve.</h2>
              <p className="muted">Open your shop. Give your inventory a home.</p>
            </div>
          </div>
          <Link href="/business/new" className="btn btn-outline">
            Hap dyqanin · Open a shop <ArrowUpRightIcon />
          </Link>
        </section>
      </main>
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={16} />;
}
