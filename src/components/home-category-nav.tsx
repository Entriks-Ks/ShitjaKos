"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import Link from "@/components/navigation-link";
import { CategoryIcon, CategoryOrbPhoto } from "@/components/category-icon";
import type { Locale } from "@/lib/catalog";

export type HomeCategoryItem = {
  id: string;
  name: string;
  icon: string;
  href: string;
  children: { id: string; name: string; href: string }[];
};

const allIn = {
  sq: (name: string) => `Të gjitha në ${name}`,
  en: (name: string) => `All in ${name}`,
  de: (name: string) => `Alles in ${name}`,
};

export function HomeCategoryNav({
  items,
  locale,
}: {
  items: HomeCategoryItem[];
  locale: Locale;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const closeTimer = useRef<number>(0);
  const panelId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const [arrowLeft, setArrowLeft] = useState(0);
  const openItem = items.find((item) => item.id === openId) ?? null;

  function placeArrow(id: string) {
    const root = rootRef.current;
    const el = itemRefs.current[id];
    if (!root || !el) return;
    const rootBox = root.getBoundingClientRect();
    const elBox = el.getBoundingClientRect();
    setArrowLeft(elBox.left + elBox.width / 2 - rootBox.left);
  }

  function open(id: string) {
    window.clearTimeout(closeTimer.current);
    setOpenId(id);
    placeArrow(id);
    requestAnimationFrame(() => placeArrow(id));
  }

  function scheduleClose() {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenId(null), 140);
  }

  useEffect(() => {
    return () => window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (!openId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    function onReposition() {
      placeArrow(openId);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
    };
  }, [openId]);

  function isMouse(event: PointerEvent) {
    return event.pointerType === "mouse" || event.pointerType === "";
  }

  return (
    <div
      className="home-category-nav"
      ref={rootRef}
      onPointerLeave={(event) => {
        if (isMouse(event)) scheduleClose();
      }}
    >
      <div className="home-categories">
        {items.map((item) => (
          <div
            key={item.id}
            className={`category-orb-wrap${openId === item.id ? " is-open" : ""}`}
            ref={(node) => {
              itemRefs.current[item.id] = node;
            }}
            onPointerEnter={(event) => {
              if (isMouse(event)) open(item.id);
            }}
          >
            <Link
              className={`category-orb${openId === item.id ? " is-open" : ""}`}
              href={item.href}
              aria-expanded={openId === item.id}
              aria-controls={item.children.length ? panelId : undefined}
              aria-haspopup={item.children.length ? "true" : undefined}
              onFocus={() => open(item.id)}
            >
              <span className="category-orb-icon">
                <CategoryOrbPhoto id={item.id} icon={item.icon} size={64} />
              </span>
              <span className="category-orb-name">{item.name}</span>
            </Link>
          </div>
        ))}
      </div>
      {openItem ? (
        <div
          className="home-category-flyout"
          id={panelId}
          role="region"
          aria-label={openItem.name}
          style={{ "--arrow-left": `${arrowLeft}px` } as CSSProperties}
          onPointerEnter={(event) => {
            if (isMouse(event)) open(openItem.id);
          }}
        >
          <div className="home-category-flyout-head">
            <span className="home-category-flyout-art" aria-hidden="true">
              <CategoryOrbPhoto id={openItem.id} icon={openItem.icon} size={88} />
              <span className="home-category-flyout-badge">
                <CategoryIcon name={openItem.icon} size={16} />
              </span>
            </span>
            <div>
              <Link href={openItem.href} className="home-category-flyout-title">
                {openItem.name}
              </Link>
              <Link href={openItem.href} className="home-category-flyout-all">
                {allIn[locale](openItem.name)}
              </Link>
            </div>
          </div>
          {openItem.children.length ? (
            <ul
              className={`home-category-flyout-list${openItem.children.length > 6 ? " is-wide" : ""}`}
            >
              {openItem.children.map((child) => (
                <li key={child.id}>
                  <Link href={child.href}>{child.name}</Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
