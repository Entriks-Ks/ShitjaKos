"use client";

import { Suspense, type ReactNode } from "react";
import Link from "@/components/navigation-link";
import { Headphones, MapPin, ShieldCheck, Store } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { cities, copy, localeOf } from "@/lib/catalog";

const footerCopy = {
  sq: {
    perk1Title: "Shpallje të kontrolluara",
    perk1Text: "Listime të kujdesura nga komuniteti",
    perk2Title: "Takim në vend publik",
    perk2Text: "Takohu aty ku ndihesh i sigurt",
    perk3Title: "Tregu yt lokal",
    perk3Text: "Bli dhe shit në Kosovë",
    perk4Title: "Për blerës e shitës",
    perk4Text: "Një vend për mundësi të reja",
    shop: "Tregu",
    accountCol: "Llogaria",
    help: "Ndihmë",
    citiesTitle: "Qytetet",
    register: "Krijo llogari",
    openShop: "Hap dyqanin",
    favorites: "Të preferuarat",
    safety: "Takohu në vend publik. Kontrollo artikullin para pagesës.",
    tagline: "Një vend për mundësi të reja. Nga komuniteti, për komunitetin.",
  },
  en: {
    perk1Title: "Reviewed listings",
    perk1Text: "Carefully kept by the community",
    perk2Title: "Meet in public",
    perk2Text: "Choose a place that feels safe",
    perk3Title: "Your local market",
    perk3Text: "Buy and sell in Kosovo",
    perk4Title: "For buyers and sellers",
    perk4Text: "A place for new opportunities",
    shop: "Marketplace",
    accountCol: "Account",
    help: "Help",
    citiesTitle: "Cities",
    register: "Create account",
    openShop: "Open a shop",
    favorites: "Favorites",
    safety: "Meet in a public place. Check the item before paying.",
    tagline: "A place for new opportunities. From the community, for the community.",
  },
  de: {
    perk1Title: "Geprüfte Anzeigen",
    perk1Text: "Von der Gemeinschaft gepflegt",
    perk2Title: "Treffen in der Öffentlichkeit",
    perk2Text: "Wähle einen sicheren Ort",
    perk3Title: "Dein lokaler Markt",
    perk3Text: "Kaufen und verkaufen im Kosovo",
    perk4Title: "Für Käufer und Verkäufer",
    perk4Text: "Ein Ort für neue Möglichkeiten",
    shop: "Marktplatz",
    accountCol: "Konto",
    help: "Hilfe",
    citiesTitle: "Städte",
    register: "Konto erstellen",
    openShop: "Shop eröffnen",
    favorites: "Favoriten",
    safety: "Trefft euch öffentlich. Prüft den Artikel vor der Zahlung.",
    tagline:
      "Ein Ort für neue Möglichkeiten. Von der Gemeinschaft, für die Gemeinschaft.",
  },
} as const;

function FooterInner() {
  const searchParams = useSearchParams();
  const locale = localeOf(searchParams?.get("lang") ?? undefined);
  const t = copy[locale];
  const f = footerCopy[locale];
  const lang = `?lang=${locale}`;
  const cityLinks = cities.filter((city) => city !== "Other").slice(0, 6);

  return (
    <footer className="site-footer">
      <section className="footer-perks">
        <div className="wrap footer-perks-grid">
          <Perk icon={ShieldCheck} title={f.perk1Title} text={f.perk1Text} />
          <Perk icon={MapPin} title={f.perk2Title} text={f.perk2Text} />
          <Perk icon={Store} title={f.perk3Title} text={f.perk3Text} />
          <Perk icon={Headphones} title={f.perk4Title} text={f.perk4Text} />
        </div>
      </section>

      <section className="footer-main">
        <div className="wrap footer-grid">
          <div className="footer-brand">
            <Link
              href={`/${lang}`}
              className="brand footer-logo"
              aria-label="ShitjaKos home"
            >
              shitja<span>kos</span>
              <i>.</i>
            </Link>
            <p>{f.tagline}</p>
          </div>
          <FooterColumn title={f.shop}>
            <Link href={`/${lang}#categories`}>{t.browse}</Link>
            <Link href={`/shops${lang}`}>{t.shops}</Link>
            <Link href={`/search${lang}`}>{t.search}</Link>
            <Link href="/listings/new">{t.sell}</Link>
          </FooterColumn>
          <FooterColumn title={f.accountCol}>
            <Link href="/login">{t.login}</Link>
            <Link href="/register">{f.register}</Link>
            <Link href="/dashboard">{t.account}</Link>
            <Link href="/dashboard/favorites">{f.favorites}</Link>
          </FooterColumn>
          <FooterColumn title={f.help}>
            <Link href="/business/new">{f.openShop}</Link>
            <Link href={`/search${lang}`}>{t.search}</Link>
            <Link href="/dashboard">{t.account}</Link>
          </FooterColumn>
          <FooterColumn title={f.citiesTitle}>
            {cityLinks.map((city) => (
              <Link
                key={city}
                href={`/search?city=${encodeURIComponent(city)}&lang=${locale}`}
              >
                {city}
              </Link>
            ))}
          </FooterColumn>
        </div>
      </section>

      <section className="footer-bottom">
        <div className="wrap footer-bottom-inner">
          <span>© {new Date().getFullYear()} ShitjaKos.</span>
          <span>{f.safety}</span>
        </div>
      </section>
    </footer>
  );
}

function Perk({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="footer-perk">
      <Icon size={22} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="footer-col">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Footer() {
  return (
    <Suspense
      fallback={
        <footer className="site-footer">
          <div className="footer-bottom">
            <div className="wrap footer-bottom-inner">
              <span>© {new Date().getFullYear()} ShitjaKos.</span>
            </div>
          </div>
        </footer>
      }
    >
      <FooterInner />
    </Suspense>
  );
}
