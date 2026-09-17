"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";

export type SearchCategoryOption = {
  id: string;
  parentId: string | null;
  name: string;
  icon: string;
};

export function SearchCategoryMenu({
  categories,
  label,
  allLabel,
  defaultValue = "",
}: {
  categories: SearchCategoryOption[];
  label: string;
  allLabel: string;
  defaultValue?: string;
}) {
  const groups = categories.filter((category) => !category.parentId);
  const childrenOf = (parentId: string) =>
    categories.filter((category) => category.parentId === parentId);

  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(defaultValue);

  const selected = categories.find((category) => category.id === selectedId);
  const selectedParent = selected?.parentId
    ? categories.find((category) => category.id === selected.parentId)
    : null;
  const buttonLabel = selected
    ? selectedParent
      ? `${selectedParent.name} · ${selected.name}`
      : selected.name
    : label;

  const hovered = groups.find((group) => group.id === hoveredId) ?? null;
  const hoveredChildren = hovered ? childrenOf(hovered.id) : [];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setHoveredId(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setHoveredId(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(id: string) {
    setSelectedId(id);
    setOpen(false);
    setHoveredId(null);
  }

  return (
    <div className="search-category" ref={rootRef}>
      <input type="hidden" name="category" value={selectedId} />
      <button
        type="button"
        className="search-category-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((current) => !current);
          setHoveredId(null);
        }}
      >
        <span className="search-category-trigger-label">
          {selected && !selected.parentId ? (
            <CategoryIcon name={selected.icon} size={16} />
          ) : selectedParent ? (
            <CategoryIcon name={selectedParent.icon} size={16} />
          ) : null}
          <span>{buttonLabel}</span>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={`search-category-panel${hovered ? " has-subs" : ""}`}
          id={listId}
          role="listbox"
          onMouseLeave={() => setHoveredId(null)}
        >
          <div className="search-category-groups">
            <button
              type="button"
              className="search-category-all"
              role="option"
              aria-selected={!selectedId}
              onMouseEnter={() => setHoveredId(null)}
              onClick={() => choose("")}
            >
              {allLabel}
            </button>
            {groups.map((group) => {
              const active = hovered?.id === group.id;
              const hasChildren = childrenOf(group.id).length > 0;
              const picked =
                selectedId === group.id ||
                childrenOf(group.id).some((child) => child.id === selectedId);
              return (
                <button
                  type="button"
                  key={group.id}
                  className={`search-category-group${active ? " is-active" : ""}${
                    picked ? " is-selected" : ""
                  }`}
                  role="option"
                  aria-selected={picked}
                  onMouseEnter={() => setHoveredId(hasChildren ? group.id : null)}
                  onFocus={() => setHoveredId(hasChildren ? group.id : null)}
                  onClick={() => choose(group.id)}
                >
                  <CategoryIcon name={group.icon} size={17} />
                  <span>{group.name}</span>
                  {hasChildren && (
                    <ChevronRight size={14} className="search-category-chevron" />
                  )}
                </button>
              );
            })}
          </div>
          {hovered && (
            <div
              className="search-category-subs"
              aria-label={hovered.name}
              onMouseEnter={() => setHoveredId(hovered.id)}
            >
              <button
                type="button"
                className="search-category-sub is-parent"
                role="option"
                aria-selected={selectedId === hovered.id}
                onClick={() => choose(hovered.id)}
              >
                {allLabel} · {hovered.name}
              </button>
              {hoveredChildren.map((child) => (
                <button
                  type="button"
                  key={child.id}
                  className={`search-category-sub${
                    selectedId === child.id ? " is-selected" : ""
                  }`}
                  role="option"
                  aria-selected={selectedId === child.id}
                  onClick={() => choose(child.id)}
                >
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
