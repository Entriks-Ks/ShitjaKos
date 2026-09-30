"use client";
import Link from "@/components/navigation-link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserRound,
  Store,
  Heart,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  MessageSquare,
  Flag,
} from "lucide-react";
import { useMessageNotifications } from "@/hooks/use-message-notifications";

export function WorkspaceNav({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  const { unread } = useMessageNotifications();
  const links = admin
    ? [
      { href: "/admin", name: "Review queue", icon: ShieldCheck },
      { href: "/admin/catalog", name: "Categories & fields", icon: Layers },
      { href: "/dashboard", name: "My account", icon: UserRound },
      { href: "/admin/users", name: "Users", icon: UserRound },
      { href: "/admin/businesses", name: "Businesses", icon: Store },
      {
        href: "/admin/message-reports", name: "Message reports", icon: Flag
      },
    ]
    : [
      { href: "/dashboard", name: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/profile", name: "Personal details", icon: UserRound },
      { href: "/dashboard/favorites", name: "My favorites", icon: Heart },
      { href: "/dashboard/shops", name: "My shops", icon: Store },
      { href: "/dashboard/messages", name: "Messages", icon: MessageSquare },
    ];
  return (
    <nav
      className="workspace-nav"
      aria-label={admin ? "Administration" : "Account navigation"}
    >
      {links.map(({ href, name, icon: Icon }) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
          <Icon size={18} />
          <span className="workspace-nav-name">{name}</span>
          {href === "/dashboard/messages" && unread > 0 ? (
            <span
              className="workspace-nav-badge"
              aria-label={`${unread} unread messages`}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Link>
      ))}
      <Link className="workspace-back" href="/">
        <ArrowUpRight size={18} />
        Back to marketplace
      </Link>
    </nav>
  );
}
