import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  ArrowUpRight,
  Package,
  Store,
  CircleCheck,
  Pencil,
  MapPin,
} from "lucide-react";
import { StatusButton } from "@/components/listing-form";
import { EmptyState, StatCard, StatusBadge } from "@/components/workspace-ui";
import { requireUser } from "@/lib/session";
import { getOwnedListings } from "@/repositories/dashboard";
import { money } from "@/lib/catalog";

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
          label="Published & approved"
          value={published}
          note="Approved for the marketplace"
        />
        <StatCard
          icon={Store}
          label="Your shops"
          value={user.memberships.length}
          note="Businesses you own or manage"
        />
      </div>
      <section id="shops" className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Your shops</h2>
            <p>Your personal profile and business memberships, in one place.</p>
          </div>
          <Link className="text-action" href="/business/new">
            <Plus size={16} />
            Open a shop
          </Link>
        </div>
        {user.memberships.length ? (
          <div className="shop-account-grid">
            {user.memberships.map(({ business, role }) => (
              <article className="workspace-card shop-account-card" key={business.id}>
                <span className="shop-emblem">
                  <Store size={23} />
                </span>
                <div>
                  <h3>{business.publicName}</h3>
                  <p>
                    <MapPin size={13} />
                    {business.city} · {role === "OWNER" ? "Owner" : "Manager"}
                  </p>
                  <StatusBadge
                    tone={
                      business.reviewStatus === "APPROVED"
                        ? "green"
                        : business.reviewStatus === "REJECTED"
                          ? "red"
                          : "amber"
                    }
                  >
                    {business.reviewStatus === "APPROVED"
                      ? "Approved"
                      : business.reviewStatus === "REJECTED"
                        ? "Review declined"
                        : "Awaiting review"}
                  </StatusBadge>
                </div>
                {business.reviewStatus === "APPROVED" && business.shop ? (
                  <Link className="text-action" href={`/shops/${business.shop.slug}`}>
                    Visit shop <ArrowUpRight size={16} />
                  </Link>
                ) : (
                  <small>
                    An independent admin reviews the business before it becomes public.
                  </small>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="shop-invitation">
            <span className="shop-emblem">
              <Store size={26} />
            </span>
            <div>
              <h3>Give your business a home.</h3>
              <p>Keep selling privately, and open a separate shop for your business.</p>
            </div>
            <Link className="btn btn-outline" href="/business/new">
              Create a shop <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
      </section>
      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Your listings</h2>
            <p>Manage your items from their first draft to the final sale.</p>
          </div>
          <Link className="btn btn-primary" href="/listings/new">
            <Plus size={16} />
            New listing
          </Link>
        </div>
        {items.length ? (
          <div className="account-listings">
            {items.map((item) => (
              <article className="account-listing" key={item.id}>
                <Link
                  className="account-listing-photo"
                  href={`/listings/${item.id}`}
                  aria-label={`Preview ${item.title}`}
                >
                  {item.media[0] ? (
                    <Image
                      src={`/api/media/${item.media[0].id}`}
                      alt={item.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <Package size={28} />
                  )}
                </Link>
                <div className="account-listing-info">
                  <p>{item.business?.publicName ?? "Personal listing"}</p>
                  <Link href={`/listings/${item.id}`}>
                    <h3>{item.title}</h3>
                  </Link>
                  <strong>{money(item.priceCents)}</strong>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <StatusBadge
                      tone={
                        item.status === "PUBLISHED" &&
                        item.moderationStatus === "APPROVED"
                          ? "green"
                          : "neutral"
                      }
                    >
                      {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                    </StatusBadge>
                    <StatusBadge
                      tone={
                        item.moderationStatus === "REJECTED"
                          ? "red"
                          : item.moderationStatus === "PENDING"
                            ? "amber"
                            : "green"
                      }
                    >
                      {item.moderationStatus === "PENDING"
                        ? "Awaiting review"
                        : item.moderationStatus === "APPROVED"
                          ? "Approved"
                          : "Review declined"}
                    </StatusBadge>
                  </div>
                </div>
                <div className="account-listing-actions">
                  <Link className="btn btn-outline" href={`/listings/${item.id}`}>
                    Preview
                  </Link>
                  {!["SOLD", "CLOSED"].includes(item.status) && (
                    <Link className="btn btn-outline" href={`/listings/${item.id}/edit`}>
                      <Pencil size={14} />
                      Edit / photos
                    </Link>
                  )}
                  {["DRAFT", "PAUSED"].includes(item.status) && (
                    <StatusButton id={item.id} target="PUBLISHED" label="Submit" />
                  )}
                  {item.status === "PUBLISHED" && (
                    <StatusButton id={item.id} target="PAUSED" label="Pause" />
                  )}
                  {["PUBLISHED", "PAUSED"].includes(item.status) && (
                    <StatusButton id={item.id} target="SOLD" label="Mark sold" />
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="workspace-card">
            <EmptyState icon={Package} title="Your next chapter starts here.">
              Add a few photos and a description to publish your first listing.
            </EmptyState>
            <div className="text-center pb-5">
              <Link className="btn btn-primary" href="/listings/new">
                <Plus size={16} />
                Create your first listing
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
