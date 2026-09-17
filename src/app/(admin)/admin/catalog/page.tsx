import Link from "@/components/navigation-link";
import { notFound } from "next/navigation";
import {
  CategoryCreateForm,
  SubcategoryCreateForm,
} from "@/components/admin-catalog-forms";
import { FieldBatchCreateForm } from "@/components/admin-field-batch-form";
import { CategoryActions, FieldDeleteAction } from "@/components/admin-catalog-actions";
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
  const activeGroups = groups.filter((category) => category.active);
  const activeGroupIds = new Set(activeGroups.map((category) => category.id));
  const activeSubcategories = subcategories.filter(
    (category) => category.active && activeGroupIds.has(category.parentId!),
  );
  const groupOptions = activeGroups.map((group) => ({
    id: group.id,
    name: translated(group.translations, "en"),
  }));

  return (
    <>
      <div className="space-y-7">
        <header className="workspace-heading">
          <Link className="text-sm underline text-emerald-800" href="/admin">
            Back to review queue
          </Link>
          <h1 className="mt-3">Categories &amp; listing fields</h1>
          <p className="muted max-w-3xl">
            Build the catalog in order: category → subcategory → fields. Names and
            choices need Albanian, English and German labels.
          </p>
        </header>

        <div>
          <details className="catalog-create">
            <summary>1. Add a category</summary>
            <div>
              <CategoryCreateForm />
            </div>
          </details>
          <details className="catalog-create">
            <summary>2. Add a subcategory</summary>
            <div>
              <SubcategoryCreateForm groups={groupOptions} />
            </div>
          </details>
          <details className="catalog-create">
            <summary>3. Add fields to a subcategory</summary>
            <div>
              <FieldBatchCreateForm
                subcategories={activeSubcategories.map((category) => ({
                  id: category.id,
                  name: translated(category.translations, "en"),
                  group: translated(
                    activeGroups.find((group) => group.id === category.parentId)
                      ?.translations ?? [],
                    "en",
                  ),
                  hasListings: category._count.listings > 0,
                  hasChoiceFilter: category.attributes.some(
                    (field) => field.type === "SELECT" && field.filterable,
                  ),
                }))}
              />
            </div>
          </details>
        </div>

        <section>
          <h2 className="mb-4">Current catalog</h2>
          <p className="muted mb-5">
            {activeGroups.length} active groups · {activeSubcategories.length} active
            subcategories. Archive keeps existing data; permanent deletion is available
            only when nothing depends on the item.
          </p>
          <div>
            {groups.map((group) => (
              <details className="catalog-group" key={group.id}>
                <summary>
                  {translated(group.translations, "en")}{" "}
                  <span className="ml-2 text-xs font-normal text-stone-500">
                    {
                      subcategories.filter((category) => category.parentId === group.id)
                        .length
                    }{" "}
                    subcategories{!group.active && " · Archived"}
                  </span>
                </summary>
                <div>
                  <div className="catalog-group-tools">
                    <span className="status-badge">
                      {group.active ? "Active" : "Archived"}
                    </span>
                    <CategoryActions
                      id={group.id}
                      name={translated(group.translations, "en")}
                      active={group.active}
                    />
                  </div>
                  <div className="space-y-3">
                    {subcategories
                      .filter((category) => category.parentId === group.id)
                      .map((category) => (
                        <div className="catalog-subcategory" key={category.id}>
                          <div className="flex justify-between gap-3 items-start">
                            <div>
                              <p className="font-medium">
                                {translated(category.translations, "en")}
                              </p>
                              <p className="text-xs text-stone-500">
                                {category._count.listings} listings ·{" "}
                                {category.active ? "Active" : "Archived"}
                              </p>
                            </div>
                            <CategoryActions
                              id={category.id}
                              name={translated(category.translations, "en")}
                              active={category.active}
                            />
                          </div>
                          <div className="catalog-fields">
                            {category.attributes.map((field) => (
                              <div
                                className="flex justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2"
                                key={field.id}
                              >
                                <span className="text-xs">
                                  {translated(field.translations, "en")} · {field.type}
                                </span>
                                <FieldDeleteAction
                                  id={field.id}
                                  name={translated(field.translations, "en")}
                                  hasValues={field._count.values > 0}
                                />
                              </div>
                            ))}
                            {!category.attributes.length && (
                              <p className="text-xs text-stone-500">
                                No custom fields yet
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    {!subcategories.some(
                      (category) => category.parentId === group.id,
                    ) && (
                      <p className="muted text-sm">
                        Add a subcategory to make this group usable.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
