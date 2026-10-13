import {
  getBusinessCategoryOptions,
  getBusinessCategorySelection,
} from "@/repositories/businesses";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { BusinessForm } from "@/components/business-form";
import Link from "@/components/navigation-link";
import { shopBrandSrcs } from "@/services/shop-images";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const membership = user.memberships.find(
    (item) => item.businessId === id && item.role === "OWNER",
  );

  if (!membership || membership.business.suspendedAt) {
    notFound();
  }

  const business = membership.business;
  const categoryOptions = await getBusinessCategoryOptions();
  const categories = categoryOptions.map((c) => ({
    id: c.id,
    name:
      c.translations.find((t) => t.locale === "sq")?.name ??
      c.translations.find((t) => t.locale === "en")?.name ??
      c.slug,
  }));
  const selectedCategories = await getBusinessCategorySelection(id);

  return (
    <main className="wrap max-w-3xl py-10">
      <Link href="/dashboard/shops" className="text-action mb-5 inline-flex">
        ← Back to your shops
      </Link>
      <h1>Edit your business</h1>
      <p className="muted mb-6">
        Update your shop details and public contact information.
      </p>

      <BusinessForm
        categories={categories}
        initial={{
          categoryIds: selectedCategories.map((c) => c.categoryId),
          id: business.id,
          legalName: business.legalName,
          publicName: business.publicName,
          email: business.email,
          phone: business.phone,
          city: business.city,
          description: business.description,
          address: business.shop?.address ?? "",
          openingHours: business.shop?.openingHours ?? "",
          ...(await shopBrandSrcs({
            logoKey: business.shop?.logoKey,
            backgroundKey: business.shop?.backgroundKey,
          })),
        }}
      />
    </main>
  );
}
