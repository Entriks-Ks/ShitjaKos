"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/navigation-link";
import { ChevronDown } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { copy, Locale, translated } from "@/lib/catalog";
import { categoryUrl, SearchParams } from "@/lib/search-navigation";
import type { getCategories } from "@/repositories/catalog";

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

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!params.category || !selectedGroupId) return;
    const children = childrenByParent.get(selectedGroupId) ?? [];
    const index = children.findIndex((category) => category.id === params.category);
    if (index >= PREVIEW_COUNT) setExpandedId(selectedGroupId);
  }, [params.category, selectedGroupId, childrenByParent]);

  return (
    <aside className="category-sidebar">
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
          {groups.map((group) => {
            const children = childrenByParent.get(group.id) ?? [];
            const expanded = expandedId === group.id;
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
                      if (hiddenCount > 0) setExpandedId(group.id);
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
                        setExpandedId((current) => (current === group.id ? null : group.id))
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
                          onClick={() => setExpandedId(group.id)}
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
