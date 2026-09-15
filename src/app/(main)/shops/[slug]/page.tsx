import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { ListingCard } from "@/components/listing-card";
import { getPublicShop, getPublicShopListings } from "@/repositories/shops";
import { localeOf } from "@/lib/catalog";
import { currentUser } from "@/lib/session";
import { ShieldCheck, MapPin } from "lucide-react";
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
  return (
    <>
      <Header locale={locale} signedIn={!!user} />
      <main className="wrap py-10">
        <section className="hero mt-0">
          <p className="eyebrow flex items-center gap-1">
            <ShieldCheck size={14} /> BUSINESS REVIEWED
          </p>
          <h1>{shop.business.publicName}</h1>
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
        <div className="grid lg:grid-cols-[240px_1fr] gap-8 mt-9">
          <aside className="panel h-fit">
            <h2 className="text-lg mb-4">Shop information</h2>
            <p className="muted">{shop.address || shop.business.city}</p>
            <p className="muted mt-3">
              {shop.openingHours || "Contact the shop for opening hours."}
            </p>
          </aside>
          <section>
            <h2 className="mb-5">Available listings ({items.length})</h2>
            {items.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item) => (
                  <ListingCard key={item.id} item={item} locale={locale} />
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
