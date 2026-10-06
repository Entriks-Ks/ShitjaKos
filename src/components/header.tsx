"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "@/components/navigation-link";
import { Plus, ArrowUpRight, ChevronDown, Globe, Heart, User } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { copy, Locale, locales } from "@/lib/catalog";
import { useMessageNotifications } from "@/hooks/use-message-notifications";

function SignedInAccountControl({ label }: { label: string }) {
  const notifications = useMessageNotifications();
  const unread = notifications.unread + (notifications.savedSearchUnread ?? 0);

  return (
    <Link
      className="header-icon-link header-account-link"
      href="/dashboard"
      aria-label={unread > 0 ? `${label}, ${unread} unread notifications` : label}
    >
      <User size={22} strokeWidth={1.5} />
      <span>{label}</span>
      {unread > 0 ? (
        <strong className="header-account-badge" aria-hidden="true">
          {unread > 99 ? "99+" : unread}
        </strong>
      ) : null}
    </Link>
  );
}

export function Header({
  locale = "sq",
  signedIn = false,
}: {
  locale?: Locale;
  signedIn?: boolean;
}) {
  const t = copy[locale];
  const pathname = usePathname();
  const categoriesActive = pathname === "/";
  const shopsActive = pathname === "/shops" || pathname.startsWith("/shops/");
  const accountControl = signedIn ? (
    <SignedInAccountControl label={t.account} />
  ) : (
    <Link className="header-icon-link" href="/login" aria-label={t.login}>
      <User size={22} strokeWidth={1.5} />
      <span>{t.login}</span>
    </Link>
  );
  const favoritesControl = (
    <Link
      className="header-icon-link"
      href="/dashboard/favorites"
      aria-label={t.favorites}
    >
      <Heart size={22} strokeWidth={1.5} />
      <span>{t.favorites}</span>
    </Link>
  );
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
        <div className="wrap header-bar">
          <Link href={`/?lang=${locale}`} className="brand" aria-label="ShitjaKos home">
            shitja<span>kos</span>
            <i>.</i>
          </Link>
          <nav className="site-nav">
            <Link
              href={`/?lang=${locale}#categories`}
              className="site-nav-link"
              aria-current={categoriesActive ? "page" : undefined}
            >
              {t.browse}
            </Link>
            <Link
              href={`/shops?lang=${locale}`}
              className="site-nav-link"
              aria-current={shopsActive ? "page" : undefined}
            >
              {t.shops}
            </Link>
          </nav>
          <div className="header-actions">
            <div className="header-icon-nav">
              {accountControl}
              {favoritesControl}
            </div>
            <Link
              href="/listings/new"
              className="btn btn-primary header-sell"
              aria-label={t.sell}
            >
              <Plus size={18} />
              <span className="header-sell-label">{t.sell}</span>
            </Link>
            <Suspense fallback={<LanguageToggleFallback locale={locale} />}>
              <LanguageToggle locale={locale} />
            </Suspense>
          </div>
        </div>
      </header>
      <nav aria-label="Mobile navigation" className="site-nav-mobile">
        <div className="wrap site-nav-mobile-inner">
          <Link
            href={`/?lang=${locale}#categories`}
            className="site-nav-link"
            aria-current={categoriesActive ? "page" : undefined}
          >
            {t.browse}
          </Link>
          <Link
            href={`/shops?lang=${locale}`}
            className="site-nav-link"
            aria-current={shopsActive ? "page" : undefined}
          >
            {t.shops}
          </Link>
        </div>
      </nav>
    </>
  );
}
function LanguageToggleFallback({ locale }: { locale: Locale }) {
  return (
    <div className="lang-toggle">
      <button
        type="button"
        aria-expanded={false}
        aria-haspopup="menu"
        aria-label="Language"
      >
        <Globe size={16} strokeWidth={1.8} />
        <span className="lang-code">{locale.toUpperCase()}</span>
        <ChevronDown className="lang-chevron" size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
function LanguageToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function hrefFor(next: Locale) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("lang", next);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="lang-toggle" ref={rootRef} data-open={open ? "true" : undefined}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Language"
        onClick={() => setOpen((value) => !value)}
      >
        <Globe size={16} strokeWidth={1.8} />
        <span className="lang-code">{locale.toUpperCase()}</span>
        <ChevronDown className="lang-chevron" size={14} strokeWidth={2} />
      </button>
      {open ? (
        <div className="lang-toggle-menu" role="menu" aria-label="Languages">
          {locales.map((item) => (
            <Link
              key={item}
              href={hrefFor(item)}
              role="menuitem"
              aria-current={item === locale ? "true" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.toUpperCase()}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
