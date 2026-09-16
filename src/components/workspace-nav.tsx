"use client";
import Link from "@/components/navigation-link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserRound,
  Store,
  ShieldCheck,
  Layers,
  ArrowUpRight,
} from "lucide-react";

export function WorkspaceNav({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  const links = admin
    ? [
        { href: "/admin", name: "Review queue", icon: ShieldCheck },
        { href: "/admin/catalog", name: "Categories & fields", icon: Layers },
        { href: "/dashboard", name: "My account", icon: UserRound },
      ]
    : [
        { href: "/dashboard", name: "Overview", icon: LayoutDashboard },
        { href: "/dashboard/profile", name: "Personal details", icon: UserRound },
        { href: "/dashboard/shops", name: "My shops", icon: Store },
      ];
  return (
    <nav
      className="workspace-nav"
      aria-label={admin ? "Administration" : "Account navigation"}
    >
      {links.map(({ href, name, icon: Icon }) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
          <Icon size={18} />
          {name}
        </Link>
      ))}
      <Link className="workspace-back" href="/">
        <ArrowUpRight size={18} />
        Back to marketplace
      </Link>
    </nav>
  );
}
