"use client";

import { useEffect, useRef } from "react";
import { MoreHorizontal, Pencil, Users } from "lucide-react";
import Link from "@/components/navigation-link";
import { DeleteBusinessButton } from "@/components/delete-business-button";
import styles from "./shop-card-menu.module.css";

export function ShopCardMenu({
  businessId,
  name,
  suspended,
}: {
  businessId: string;
  name: string;
  suspended: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      const element = menu.current;
      if (element?.querySelector("dialog[open]")) return;
      if (event.target instanceof Node && !element?.contains(event.target)) {
        element?.removeAttribute("open");
      }
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  return (
    <details
      ref={menu}
      className={styles.menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !menu.current?.querySelector("dialog[open]")) {
          menu.current?.removeAttribute("open");
          menu.current?.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label={`Manage ${name}`} title="Shop options">
        <MoreHorizontal size={20} aria-hidden="true" />
      </summary>
      <div className={styles.panel}>
        {!suspended && (
          <>
            <Link href={`/business/${businessId}/edit`}>
              <Pencil size={16} aria-hidden="true" /> Edit business
            </Link>
            <Link href={`/business/${businessId}/staff`}>
              <Users size={16} aria-hidden="true" /> Manage staff
            </Link>
          </>
        )}
        <div className={styles.deleteRow}>
          <DeleteBusinessButton businessId={businessId} name={name} />
        </div>
      </div>
    </details>
  );
}
