import Link from "@/components/navigation-link";
import { Plus, ArrowUpRight } from "lucide-react";
import { copy, Locale } from "@/lib/catalog";
export function Header({
  locale = "sq",
  signedIn = false,
}: {
  locale?: Locale;
  signedIn?: boolean;
}) {
  const t = copy[locale];
  return (
    <>
      <div className="topline">
        <div className="wrap flex justify-between">
          <span>Blej. Shit. Gjej diçka të mirë.</span>
          <span className="hidden sm:block">
            Nga komuniteti, për komunitetin <ArrowUpRight size={12} className="inline" />
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="wrap flex items-center justify-between gap-4 py-5">
          <Link href={`/?lang=${locale}`} className="brand" aria-label="ShitjaKos home">
            shitja<span>kos</span>
            <i>.</i>
          </Link>
          <nav className="hidden md:flex gap-7 text-sm font-medium">
            <Link href={`/?lang=${locale}#categories`}>{t.browse}</Link>
            <Link href={`/shops?lang=${locale}`}>{t.shops}</Link>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-xs">
              {(["sq", "en", "de"] as const).map((l) => (
                <Link
                  aria-label={`Language ${l}`}
                  className={
                    l === locale ? "font-bold text-emerald-800" : "text-stone-400"
                  }
                  key={l}
                  href={`/?lang=${l}`}
                >
                  {l.toUpperCase()}
                </Link>
              ))}
            </div>
            <Link
              className="hidden sm:block text-sm font-medium"
              href={signedIn ? "/dashboard" : "/login"}
            >
              {signedIn ? t.account : t.login}
            </Link>
            <Link href="/listings/new" className="btn btn-primary">
              <Plus size={17} />
              <span>{t.sell}</span>
            </Link>
          </div>
        </div>
        <nav
          aria-label="Mobile navigation"
          className="wrap flex justify-between gap-4 pb-4 text-xs font-medium md:hidden"
        >
          <Link href={`/?lang=${locale}#categories`}>{t.browse}</Link>
          <Link href={`/shops?lang=${locale}`}>{t.shops}</Link>
          <Link className="sm:hidden" href={signedIn ? "/dashboard" : "/login"}>
            {signedIn ? t.account : t.login}
          </Link>
        </nav>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="wrap border-t border-stone-200 mt-20 py-9 flex flex-wrap gap-4 justify-between text-sm text-stone-500">
      <span>
        <strong className="text-stone-800">ShitjaKos.</strong> Një vend për mundësi të
        reja.
      </span>
      <span>Takohu në vend publik. Kontrollo artikullin para pagesës.</span>
    </footer>
  );
}
