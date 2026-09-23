import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { ListingCard } from "@/components/listing-card";
import { getPublicShop, getPublicShopListings } from "@/repositories/shops";
import { getFavoriteListingIds } from "@/repositories/favorites";
import { localeOf } from "@/lib/catalog";
import { currentActor as currentUser } from "@/lib/session";
import {
  Building2,
  CalendarDays,
  Clock,
  Locate,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
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
    <div className="shop-info-item">
      <span className="shop-info-icon">
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
  const shop = await getPublicShop(slug);
  if (!shop) notFound();
  const [user, items] = await Promise.all([
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
  return (
    <>
      <Header locale={locale} signedIn={!!user} />
      <main className="wrap py-10">
        <section className="hero mt-0">
          <p className="eyebrow flex items-center gap-1">
            <ShieldCheck size={14} /> BUSINESS REVIEWED
          </p>
          <h1>{shop.business.publicName}</h1>
          {shop.tagline.trim() ? (
            <p className="muted max-w-2xl">{shop.tagline}</p>
          ) : null}
          <p className="muted max-w-2xl">{shop.business.description}</p>
          <div className="flex flex-wrap gap-5 mt-5 text-sm">
            <span className="flex items-center gap-1">
              <MapPin size={15} />
              {shop.business.city}
            </span>
            <a href={`tel:${shop.business.phone}`}>{shop.business.phone}</a>
            <a href={`mailto:${shop.business.email}`}>{shop.business.email}</a>
          </div>
        </section>
        <div className="shop-body">
          <aside className="panel shop-info h-fit">
            <h2>Shop information</h2>
            <dl className="shop-info-list">
              <ShopFact
                icon={MapPin}
                label="Address"
                value={shop.address.trim() || shop.business.city}
              />
              <ShopFact icon={Locate} label="City" value={shop.business.city} />
              <ShopFact
                icon={Clock}
                label="Opening hours"
                value={shop.openingHours.trim() || "Contact the shop for opening hours."}
              />
              <ShopFact
                icon={Building2}
                label="Legal name"
                value={shop.business.legalName}
              />
              <ShopFact
                icon={Phone}
                label="Phone"
                value={<a href={`tel:${shop.business.phone}`}>{shop.business.phone}</a>}
              />
              <ShopFact
                icon={Mail}
                label="Email"
                value={<a href={`mailto:${shop.business.email}`}>{shop.business.email}</a>}
              />
              <ShopFact
                icon={CalendarDays}
                label="Member since"
                value={shop.business.createdAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
              {shop.business.reviewedAt ? (
                <ShopFact
                  icon={ShieldCheck}
                  label="Reviewed"
                  value={shop.business.reviewedAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
              ) : null}
            </dl>
          </aside>
          <section>
            <h2 className="mb-5">Available listings ({items.length})</h2>
            {items.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
              <div className="empty">This shop has no active listings yet.</div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
