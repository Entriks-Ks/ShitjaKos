import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { copy, Locale, translated } from "@/lib/catalog";
import { categoryUrl, SearchParams } from "@/lib/search-navigation";
import type { getCategories } from "@/repositories/catalog";

export function CategorySidebar({
  categories,
  params,
  locale,
}: {
  categories: Awaited<ReturnType<typeof getCategories>>;
  params: SearchParams;
  locale: Locale;
}) {
  const all = { sq: "Të gjitha kategoritë", en: "All categories", de: "Alle Kategorien" }[
    locale
  ];
  return (
    <aside className="category-sidebar">
      <details className="category-disclosure">
        <summary>
          {copy[locale].browse}
          <ChevronDown size={17} />
        </summary>
        <nav aria-label={copy[locale].browse} className="category-tree">
          <Link
            className="category-all"
            href={categoryUrl(params)}
            aria-current={!params.category ? "page" : undefined}
          >
            {all}
          </Link>
          {categories
            .filter((category) => !category.parentId)
            .map((group) => (
              <div className="category-branch" key={group.id}>
                <Link
                  className="category-parent"
                  href={categoryUrl(params, group.id)}
                  aria-current={params.category === group.id ? "page" : undefined}
                >
                  <CategoryIcon name={group.icon} size={17} />
                  <span>{translated(group.translations, locale)}</span>
                </Link>
                <ul>
                  {categories
                    .filter((category) => category.parentId === group.id)
                    .map((category) => (
                      <li key={category.id}>
                        <Link
                          href={categoryUrl(params, category.id)}
                          aria-current={
                            params.category === category.id ? "page" : undefined
                          }
                        >
                          {translated(category.translations, locale)}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
        </nav>
      </details>
    </aside>
  );
}
