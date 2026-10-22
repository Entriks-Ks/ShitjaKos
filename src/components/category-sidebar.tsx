"use client";

import { useMemo, useState } from "react";
import Link from "@/components/navigation-link";
import { ChevronDown } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { copy, Locale, translated } from "@/lib/catalog";
import { categoryUrl, SearchParams } from "@/lib/search-navigation";
import type { getCategories } from "@/repositories/catalog";
import { MAX_ATTRIBUTE_FILTERS } from "@/lib/attribute-search";
import { SidebarAttributeFilters } from "@/components/sidebar-attribute-filters";

const PREVIEW_COUNT = 2;

type CategoryRow = Awaited<ReturnType<typeof getCategories>>[number];

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
  const moreLabel = { sq: "Më shumë", en: "Show more", de: "Mehr anzeigen" }[locale];
  const lessLabel = { sq: "Më pak", en: "Show less", de: "Weniger anzeigen" }[locale];

  const groups = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, CategoryRow[]>();
    for (const category of categories) {
      if (!category.parentId) continue;
      const list = map.get(category.parentId) ?? [];
      list.push(category);
      map.set(category.parentId, list);
    }
    return map;
  }, [categories]);

  const selectedGroupId = useMemo(() => {
    if (!params.category) return null;
    const selected = categories.find((category) => category.id === params.category);
    if (!selected) return null;
    return selected.parentId ?? selected.id;
  }, [categories, params.category]);

  const orderedGroups = useMemo(() => {
    if (!selectedGroupId) return groups;
    const selected = groups.find(group => group.id === selectedGroupId);

    if (!selected) return groups;

    return [selected, ...groups.filter(group => group.id !== selectedGroupId)];
  }, [groups, selectedGroupId]);


  const [expansionOverride, setExpansionOverride] = useState<{
    groupId: string;
    expanded: boolean;
  } | null>(null);



  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === params.category),
    [categories, params.category],
  );

  const isSubcategory = Boolean(selectedCategory?.parentId);

  const attributes = useMemo(() => {
    if (!isSubcategory) return [];

    return (selectedCategory?.attributes ?? [])
      .filter((attribute) => ["SELECT", "NUMBER", "BOOLEAN"].includes(attribute.type))
      .slice(0, MAX_ATTRIBUTE_FILTERS);
  }, [selectedCategory, isSubcategory]);
  if (isSubcategory && selectedCategory) {
    const parentCategory = categories.find(
      (category) => category.id === selectedCategory.parentId,
    );

    return (
      <aside
        className="category-sidebar"
        tabIndex={0}
        aria-label={copy[locale].browse}
      >
        <nav
          aria-label={copy[locale].browse}
          className="sidebar-category-path"
        >
          <Link
            href={categoryUrl(params)}
            className="sidebar-category-path__all"
          >
            {all}
          </Link>

          <div className="sidebar-category-path__branch">
            {parentCategory && (
              <Link
                href={categoryUrl(params, parentCategory.id)}
                className="sidebar-category-path__parent"
              >
                <CategoryIcon name={parentCategory.icon} size={17} />

                <span>
                  {translated(parentCategory.translations, locale)}
                </span>
              </Link>
            )}

            <div className="sidebar-category-path__leaf">
              <span aria-current="page">
                {translated(selectedCategory.translations, locale)}
              </span>
            </div>
          </div>
        </nav>

        <SidebarAttributeFilters
          key={JSON.stringify(params)}
          attributes={attributes}
          categoryName={translated(selectedCategory.translations, locale)}
          params={params}
          locale={locale}
        />
      </aside>
    );
  }

  return (
    <aside className="category-sidebar" tabIndex={0} aria-label={copy[locale].browse}>
      {isSubcategory && selectedCategory && (
        <SidebarAttributeFilters
          key={JSON.stringify(params)}
          attributes={attributes}
          categoryName={translated(selectedCategory.translations, locale)}
          params={params}
          locale={locale}
        />
      )}
      <details className="category-disclosure" open>
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
          {orderedGroups.map((group) => {
            const children = childrenByParent.get(group.id) ?? [];
            const expanded =
              expansionOverride?.groupId === group.id
                ? expansionOverride.expanded
                : selectedGroupId === group.id;
            const visible = expanded ? children : children.slice(0, PREVIEW_COUNT);
            const hiddenCount = Math.max(0, children.length - PREVIEW_COUNT);

            return (
              <div className="category-branch" key={group.id}>
                <div className="category-parent-row">
                  <Link
                    className="category-parent"
                    href={categoryUrl(params, group.id)}
                    aria-current={params.category === group.id ? "page" : undefined}
                    onClick={() => {
                      if (hiddenCount > 0)
                        setExpansionOverride({
                          groupId: group.id,
                          expanded: true,
                        });
                    }}
                  >
                    <CategoryIcon name={group.icon} size={17} />
                    <span>{translated(group.translations, locale)}</span>
                  </Link>
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      className="category-expand"
                      aria-expanded={expanded}
                      aria-label={expanded ? lessLabel : moreLabel}
                      onClick={() =>
                        setExpansionOverride({
                          groupId: group.id,
                          expanded: !expanded,
                        })
                      }
                    >
                      <ChevronDown
                        size={15}
                        className={expanded ? "is-open" : undefined}
                      />
                    </button>
                  )}
                </div>
                {children.length > 0 && (
                  <ul>
                    {visible.map((category) => (
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
                    {hiddenCount > 0 && !expanded && (
                      <li>
                        <button
                          type="button"
                          className="category-more"
                          onClick={() =>
                            setExpansionOverride({
                              groupId: group.id,
                              expanded: !expanded,
                            })
                          }
                        >
                          {moreLabel} · {hiddenCount}
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </details>
    </aside>
  );
}
