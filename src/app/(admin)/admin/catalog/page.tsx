import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryCreateForm, FieldCreateForm } from "@/components/admin-catalog-forms";
import { requireUser } from "@/lib/session";
import { isStaff } from "@/lib/permissions";
import { translated } from "@/lib/catalog";
import { getAdminCatalog } from "@/repositories/catalog";

export const metadata = {
  title: "Manage categories and fields",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const actor = await requireUser();
  if (!isStaff(actor)) notFound();

  const categories = await getAdminCatalog();
  const groups = categories.filter((category) => !category.parentId);
  const subcategories = categories.filter((category) => category.parentId);

  return (
    <>
      <main className="wrap py-10 space-y-10">
        <div>
          <Link className="text-sm underline text-emerald-800" href="/admin">
            Back to review queue
          </Link>
          <h1 className="mt-3">Categories &amp; listing fields</h1>
          <p className="muted max-w-3xl">
            Add a category group, then its subcategories. Listing fields belong to
            subcategories and appear when someone creates a listing. Names and choices
            need Albanian, English and German labels.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <CategoryCreateForm
            groups={groups.map((group) => ({
              id: group.id,
              name: translated(group.translations, "en"),
            }))}
          />
          <FieldCreateForm
            subcategories={subcategories.map((category) => ({
              id: category.id,
              name: translated(category.translations, "en"),
              group: translated(
                groups.find((group) => group.id === category.parentId)?.translations ??
                  [],
                "en",
              ),
              hasListings: category._count.listings > 0,
              hasChoiceFilter: category.attributes.some(
                (field) => field.type === "SELECT" && field.filterable,
              ),
            }))}
          />
        </div>

        <section>
          <h2 className="mb-4">Current catalog</h2>
          <p className="muted mb-5">
            {groups.length} groups · {subcategories.length} subcategories. Newly added
            subcategories are available to private and business sellers immediately.
          </p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {groups.map((group) => (
              <article className="panel" key={group.id}>
                <h3 className="font-semibold mb-3">
                  {translated(group.translations, "en")}
                </h3>
                <div className="space-y-3">
                  {subcategories
                    .filter((category) => category.parentId === group.id)
                    .map((category) => (
                      <div className="border-t border-stone-100 pt-3" key={category.id}>
                        <p className="font-medium">
                          {translated(category.translations, "en")}
                        </p>
                        <p className="text-xs text-stone-500">
                          {category.attributes.length
                            ? category.attributes
                                .map((field) => translated(field.translations, "en"))
                                .join(" · ")
                            : "No custom fields yet"}
                        </p>
                      </div>
                    ))}
                  {!subcategories.some((category) => category.parentId === group.id) && (
                    <p className="muted text-sm">
                      Add a subcategory to make this group usable.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
