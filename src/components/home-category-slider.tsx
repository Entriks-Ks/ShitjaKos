"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "@/components/navigation-link";
import { CategoryIcon } from "@/components/category-icon";

export function HomeCategorySlider({
  items,
}: {
  items: { id: string; name: string; icon: string; href: string }[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  function update() {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  function slide(direction: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items.length]);

  return (
    <div className="home-category-slider">
      <button
        type="button"
        className="home-category-arrow"
        aria-label="Previous categories"
        disabled={!canPrev}
        onClick={() => slide(-1)}
      >
        <ChevronLeft size={20} />
      </button>
      <div className="home-categories" ref={scroller}>
        {items.map((item) => (
          <Link key={item.id} className="category-orb" href={item.href}>
            <span className="category-orb-icon">
              <CategoryIcon name={item.icon} size={26} />
            </span>
            <span className="category-orb-name">{item.name}</span>
          </Link>
        ))}
      </div>
      <button
        type="button"
        className="home-category-arrow home-category-arrow-next"
        aria-label="Next categories"
        disabled={!canNext}
        onClick={() => slide(1)}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
