import Link from "@/components/navigation-link";
import { ArrowUpRight, Package, Store, CircleCheck, Pencil } from "lucide-react";
import { AccountShops } from "@/components/account-shops";
import { DashboardListings } from "@/components/dashboard-listings";
import { StatCard } from "@/components/workspace-ui";
import { requireUser } from "@/lib/session";
import { getOwnedListings } from "@/repositories/dashboard";
import { shopLogosForMemberships } from "@/services/shop-images";

export const metadata = { title: "My account", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const user = await requireUser();
  const items = await getOwnedListings(user.id);
  const published = items.filter(
    (item) => item.status === "PUBLISHED" && item.moderationStatus === "APPROVED",
  ).length;
  return (
    <>
      <header className="workspace-welcome">
        <div>
          <p className="eyebrow">YOUR MARKETPLACE CORNER</p>
          <h1>Hello, {user.name.split(" ")[0]}.</h1>
          <p>Your listings, your shops, and everything in between.</p>
          <Link className="welcome-link" href="/dashboard/profile">
            <Pencil size={14} />
            Edit your profile <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="welcome-symbol" aria-hidden="true">
          <Store size={62} strokeWidth={1.3} />
        </div>
      </header>
      <div className="workspace-stats">
        <StatCard
          icon={Package}
          label="Your listings"
          value={items.length}
          note="Personal & business inventory"
        />
        <StatCard
          icon={CircleCheck}
          label="Published listings"
          value={published}
          note="Published on the marketplace"
        />
        <StatCard
          icon={Store}
          label="Your shops"
          href="/dashboard/shops"
          value={user.memberships.length}
          note="Businesses you own or manage"
        />
      </div>
      <AccountShops memberships={await shopLogosForMemberships(user.memberships)} />
      <DashboardListings items={items} />
    </>
  );
}
