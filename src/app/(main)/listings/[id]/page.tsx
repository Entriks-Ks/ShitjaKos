import Image from "next/image";
import Link from "@/components/navigation-link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck, Phone, Store } from "lucide-react";
import { Header } from "@/components/header";
import { ListingCard } from "@/components/listing-card";
import { currentActor as currentUser } from "@/lib/session";
import { canManageListing, isStaff } from "@/lib/permissions";
import {
  getPublicListingMarker,
  getListingPreview,
  getSimilarListings,
} from "@/repositories/listings";
import { localeOf, money, translated } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: true } };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const locale = localeOf((await searchParams).lang);
  const [user, visible, item] = await Promise.all([
    currentUser(),
    getPublicListingMarker(id),
    getListingPreview(id),
  ]);
  if (!item) notFound();
  const owner = user ? canManageListing(user, item) : false;
  if (!visible && !owner && !(user && isStaff(user))) notFound();
  const similar = visible ? await getSimilarListings(item.categoryId, id) : [];
  return (
    <>
      <Header locale={locale} signedIn={!!user} />
      <main className="wrap py-8">
        <nav className="text-xs text-stone-500 mb-7">
          <Link href={`/?lang=${locale}`}>ShitjaKos</Link> /{" "}
          <Link href={`/?category=${item.categoryId}&lang=${locale}`}>
            {translated(item.category.translations, locale)}
          </Link>{" "}
          / {item.title}
        </nav>
        {!visible && (
          <p className="notice mb-5">
            Private preview — {item.status}. This listing is not public.
          </p>
        )}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
          <section>
            <div className="relative aspect-[4/3] bg-stone-100 rounded-2xl overflow-hidden">
              {item.media[0] ? (
                <Image
                  priority
                  unoptimized
                  fill
                  className="object-contain"
                  src={`/api/media/${item.media[0].id}`}
                  alt={item.media[0].altText}
                />
              ) : (
                <div className="grid place-items-center h-full text-stone-400">
                  No photos yet
                </div>
              )}
            </div>
            {item.media.length > 1 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {item.media.slice(1).map((m) => (
                  <a
                    key={m.id}
                    href={`/api/media/${m.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="relative aspect-square rounded-lg overflow-hidden"
                  >
                    <Image
                      unoptimized
                      fill
                      className="object-cover"
                      src={`/api/media/${m.id}`}
                      alt={m.altText}
                    />
                  </a>
                ))}
              </div>
            )}
            <article className="panel mt-6">
              <h2>Description</h2>
              <p className="whitespace-pre-wrap text-sm leading-7 mt-4">
                {item.description}
              </p>
              <dl className="grid grid-cols-2 gap-4 border-t border-stone-200 mt-6 pt-5">
                <div>
                  <dt className="muted">Condition</dt>
                  <dd className="text-sm font-medium">
                    {item.condition.replaceAll("_", " ")}
                  </dd>
                </div>
                {item.attributes.map((a) => (
                  <div key={a.attributeId}>
                    <dt className="muted">
                      {translated(a.attribute.translations, locale)}
                    </dt>
                    <dd className="text-sm font-medium">
                      {typeof a.value === "boolean"
                        ? a.value
                          ? "Yes"
                          : "No"
                        : String(a.value)}{" "}
                      {a.attribute.unit}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          </section>
          <aside>
            <div className="panel">
              <div className="flex gap-2 mb-5">
                <span className="pill">
                  {item.intent === "WANTED" ? "Wanted" : "For sale"}
                </span>
                <span className="pill">
                  {item.business ? "Business" : "Private seller"}
                </span>
              </div>
              <h1>{item.title}</h1>
              <p className="text-3xl font-semibold mt-5">{money(item.priceCents)}</p>
              {item.negotiable && <p className="muted">Negotiable</p>}
              <p className="muted flex items-center gap-2 mt-6">
                <MapPin size={16} />
                {item.city}
              </p>
              <p className="text-xs text-stone-400 mt-2">
                Listed {item.createdAt.toLocaleDateString("en-GB")}
              </p>
              {owner && (
                <Link
                  className="btn btn-outline mt-6 w-full"
                  href={`/listings/${id}/edit`}
                >
                  Manage your listing
                </Link>
              )}
            </div>
            <section className="panel mt-5">
              <div className="flex gap-3 items-center">
                <div className="category-icon">
                  <Store size={21} />
                </div>
                <div>
                  <h2 className="text-lg">
                    {item.business?.publicName ?? item.personalProfile?.displayName}
                  </h2>
                  {item.business?.reviewStatus === "APPROVED" && (
                    <p className="text-xs text-emerald-800 flex items-center gap-1">
                      <ShieldCheck size={13} />
                      Business reviewed
                    </p>
                  )}
                </div>
              </div>
              {item.business?.shop && (
                <Link
                  className="btn btn-outline w-full mt-5"
                  href={`/shops/${item.business.shop.slug}?lang=${locale}`}
                >
                  Visit shop
                </Link>
              )}
              {visible && item.phoneVisible && item.contactPhone ? (
                <a
                  className="btn btn-primary w-full mt-3"
                  href={`tel:${item.contactPhone}`}
                >
                  <Phone size={16} />
                  {item.contactPhone}
                </a>
              ) : (
                <p className="muted mt-4">
                  The seller has not shared a public phone number.
                </p>
              )}
            </section>
            <div className="notice mt-5">
              <strong>Meet safely.</strong>
              <br />
              Inspect the item before paying. Never share your password or verification
              codes.
            </div>
          </aside>
        </div>
        {similar.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-5">More to explore</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {similar.map((i) => (
                <ListingCard key={i.id} item={i} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
