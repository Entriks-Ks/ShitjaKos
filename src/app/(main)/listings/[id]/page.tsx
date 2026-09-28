import Link from "@/components/navigation-link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { ListingCard } from "@/components/listing-card";
import { currentActor as currentUser } from "@/lib/session";
import { canManageListing, isStaff } from "@/lib/permissions";
import { getFavoriteListingIds } from "@/repositories/favorites";
import {
  getPublicListingMarker,
  getListingPreview,
  getSimilarListings,
} from "@/repositories/listings";
import { copy, localeOf, translated } from "@/lib/catalog";
import { readShopImageSrc } from "@/services/shop-images";
import { ListingGallery } from "@/components/listing-gallery";
import { ListingFacts } from "@/components/listing-facts";
import { ListingSummary } from "@/components/listing-summary";
import styles from "@/components/listing-detail.module.css";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: true } };

const dateLocales = { sq: "sq-AL", en: "en-GB", de: "de-DE" } as const;

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
  const favoriteIds =
    visible && user
      ? await getFavoriteListingIds(user.id, [
          id,
          ...similar.map((listing) => listing.id),
        ])
      : [];
  const favorites = new Set(favoriteIds);
  const t = copy[locale];
  const categoryName = translated(item.category.translations, locale);
  const listedOn = item.createdAt.toLocaleDateString(dateLocales[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const sellerLogo = await readShopImageSrc("logo", item.business?.shop?.logoKey);
  const isPublic = Boolean(visible);
  return (
    <>
      <Header locale={locale} signedIn={!!user} />
      <section className="listing-banner">
        <div className="wrap">
          <h1>{t.listingPage}</h1>
          <nav aria-label="Breadcrumb" className="listing-banner-path">
            <Link href={`/?lang=${locale}`}>{t.home}</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/search?lang=${locale}&category=${item.categoryId}`}>
              {categoryName}
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{item.title}</span>
          </nav>
        </div>
      </section>
      <main className="wrap py-8">
        {!visible && (
          <p className="notice mb-5">
            Private preview — {item.status}. This listing is not public.
          </p>
        )}
        <div className={styles.hero}>
          <ListingGallery media={item.media} />
          <ListingSummary
            id={id}
            locale={locale}
            title={item.title}
            categoryName={categoryName}
            intent={item.intent}
            priceCents={item.priceCents}
            negotiable={item.negotiable}
            city={item.city}
            listedOn={listedOn}
            sellerName={
              item.business?.publicName ?? item.personalProfile?.displayName ?? ""
            }
            isBusiness={Boolean(item.business)}
            businessReviewed={item.business?.reviewStatus === "APPROVED"}
            shopSlug={item.business?.shop?.slug}
            sellerLogo={sellerLogo}
            phone={
              isPublic && item.phoneVisible && item.contactPhone
                ? item.contactPhone
                : null
            }
            visible={isPublic}
            owner={owner}
            signedIn={!!user}
            saved={favorites.has(id)}
            labels={t}
          />
        </div>
        <ListingFacts
          description={item.description}
          fields={[
            {
              name: t.condition,
              value: item.condition.replaceAll("_", " "),
            },
            ...item.attributes.map((a) => ({
              name: translated(a.attribute.translations, locale),
              value: `${
                typeof a.value === "boolean"
                  ? a.value
                    ? "Yes"
                    : "No"
                  : String(a.value)
              }${a.attribute.unit ? ` ${a.attribute.unit}` : ""}`.trim(),
            })),
          ]}
          extra={item.additionalData.map((row) => ({
            name: row.name,
            value: row.value,
          }))}
          labels={{
            description: t.description,
            additionalInfo: t.additionalInfo,
            attribute: t.attribute,
            details: t.details,
            noAdditionalInfo: t.noAdditionalInfo,
          }}
        />
        {similar.length > 0 && (
          <section className={styles.related}>
            <p className={styles.relatedEyebrow}>{t.relatedEyebrow}</p>
            <h2 className={styles.relatedTitle}>
              {t.relatedLead}{" "}
              <span className={styles.relatedAccent}>{t.relatedAccent}</span>
            </h2>
            <div className={styles.relatedGrid}>
              {similar.map((i) => (
                <ListingCard
                  key={i.id}
                  item={i}
                  locale={locale}
                  viewerSignedIn={!!user}
                  saved={favorites.has(i.id)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
