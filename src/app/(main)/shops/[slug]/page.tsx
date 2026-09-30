import type { ReactNode } from "react";
import { BusinessViewTracker } from "@/components/business-performance/view-tracker";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/header";
import { ListingCard } from "@/components/listing-card";
import { getPublicShop, getPublicShopListings } from "@/repositories/shops";
import { shopBrandSrcs } from "@/services/shop-images";
import { getFavoriteListingIds } from "@/repositories/favorites";
import { copy, localeOf } from "@/lib/catalog";
import { currentActor as currentUser } from "@/lib/session";
import {
  Building2,
  CalendarDays,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function ShopFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="shop-info-row">
      <span className="shop-info-row-icon">
        <Icon size={15} strokeWidth={1.8} />
      </span>
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const locale = localeOf((await searchParams).lang);
  const t = copy[locale];
  const shop = await getPublicShop(slug);
  if (!shop) notFound();
  const [{ logoSrc, backgroundSrc }, user, items] = await Promise.all([
    shopBrandSrcs(shop),
    currentUser(),
    getPublicShopListings(shop.businessId),
  ]);
  const favoriteIds = user
    ? await getFavoriteListingIds(
        user.id,
        items.map((item) => item.id),
      )
    : [];
  const favorites = new Set(favoriteIds);
  const dateText = (value: Date) =>
    value.toLocaleDateString(
      locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : "sq-AL",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  const street = shop.address.trim();

  return (
    <>
      <Header locale={locale} signedIn={!!user} />
      {user && <BusinessViewTracker kind="shop" id={shop.businessId} />}
      <main className="wrap shop-page">
        <section className="shop-hero">
          <div className="shop-cover">
            {backgroundSrc ? (
              <Image
                unoptimized
                fill
                sizes="100vw"
                className="shop-cover-photo"
                src={backgroundSrc}
                alt=""
              />
            ) : null}
            <div className="shop-cover-shade" aria-hidden="true" />
            <p className="shop-verified">
              <ShieldCheck size={15} strokeWidth={2.2} />
              {t.verified}
            </p>
          </div>

          <header className="shop-profile">
            {logoSrc ? (
              <Image
                unoptimized
                width={120}
                height={120}
                className="shop-profile-logo"
                src={logoSrc}
                alt=""
              />
            ) : (
              <div className="shop-profile-logo shop-profile-logo-empty">
                <Store size={36} />
              </div>
            )}
            <div className="shop-profile-copy">
              <h1>{shop.business.publicName}</h1>
              {shop.tagline.trim() ? (
                <p className="shop-profile-tagline">{shop.tagline}</p>
              ) : null}
              <div className="shop-profile-meta">
                <p className="shop-profile-contacts">
                  <span>
                    <MapPin size={14} />
                    {shop.business.city}
                  </span>
                  <a href={`tel:${shop.business.phone}`}>
                    <Phone size={14} />
                    {shop.business.phone}
                  </a>
                  <a href={`mailto:${shop.business.email}`}>
                    <Mail size={14} />
                    {shop.business.email}
                  </a>
                </p>
                <span className="shop-company">
                  <span className="shop-company-mark">
                    <Store size={12} />
                  </span>
                  {t.company}
                </span>
              </div>
            </div>
          </header>
        </section>

        <div className="shop-body">
          <aside className="panel shop-info">
            <h2>{t.shopInfo}</h2>
            {shop.business.description.trim() ? (
              <p className="shop-info-about">{shop.business.description}</p>
            ) : null}
            <dl className="shop-info-list">
              {street ? (
                <ShopFact
                  icon={MapPin}
                  label={t.address}
                  value={
                    <>
                      {street}
                      <span className="shop-info-sub">{shop.business.city}</span>
                    </>
                  }
                />
              ) : null}
              {shop.openingHours.trim() ? (
                <ShopFact icon={Clock} label={t.openingHours} value={shop.openingHours} />
              ) : null}
              <ShopFact
                icon={Building2}
                label={t.legalName}
                value={shop.business.legalName}
              />
              <ShopFact
                icon={CalendarDays}
                label={t.memberSince}
                value={dateText(shop.business.createdAt)}
              />
              {shop.business.reviewedAt ? (
                <ShopFact
                  icon={ShieldCheck}
                  label={t.reviewedOn}
                  value={dateText(shop.business.reviewedAt)}
                />
              ) : null}
            </dl>
          </aside>
          <section>
            <div className="shop-listings-head">
              <h2>{t.availableListings}</h2>
              <span className="shop-listings-count">{items.length}</span>
            </div>
            {items.length ? (
              <div className="shop-listings-grid">
                {items.map((item) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    locale={locale}
                    viewerSignedIn={!!user}
                    saved={favorites.has(item.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty">{t.shopEmptyListings}</div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
