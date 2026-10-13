import { getBusinessCategoryOptions } from "@/repositories/businesses";
import { BusinessForm } from "@/components/business-form";
import { requireUser } from "@/lib/session";
export const metadata = { title: "Open a shop", robots: { index: false, follow: false } };
export default async function Page() {
  await requireUser();
  const categoryOptions = await getBusinessCategoryOptions();
  const categories = categoryOptions.map((c) => ({
    id: c.id,
    name:
      c.translations.find((t) => t.locale === "sq")?.name ??
      c.translations.find((t) => t.locale === "en")?.name ??
      c.slug,
  }));

  return (
    <>
      <main className="wrap max-w-3xl py-10">
        <p className="eyebrow">PËR BIZNESET LOKALE</p>
        <h1>Make room for your business.</h1>
        <p className="muted mb-7">
          One shop, all your inventory. Owned by your business.
        </p>
        <BusinessForm categories={categories} />
      </main>
    </>
  );
}
