"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "@/components/navigation-link";
import { Package, Pencil, Plus } from "lucide-react";
import { StatusButton } from "@/components/listing-form";
import { DeleteListingButton } from "@/components/delete-listing-button";
import { StatusBadge } from "@/components/workspace-ui";
import { EmptyListings } from "@/components/empty-listings";
import { money } from "@/lib/catalog";

type ListingItem = {
  id: string;
  title: string;
  status: string;
  moderationStatus: string;
  priceCents: number;
  business: { publicName: string } | null;
  media: { id: string }[];
};

const filters = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "draft", label: "Drafts" },
  { id: "paused", label: "Paused" },
  { id: "sold", label: "Sold" },
] as const;

type FilterId = (typeof filters)[number]["id"];

function matches(item: ListingItem, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "live") return item.status === "PUBLISHED";
  if (filter === "draft") return item.status === "DRAFT";
  if (filter === "paused") return item.status === "PAUSED";
  return item.status === "SOLD" || item.status === "CLOSED";
}

function statusTone(item: ListingItem): "green" | "amber" | "red" | "neutral" {
  if (item.moderationStatus === "REJECTED") return "red";
  if (item.status === "PUBLISHED") return "green";
  if (item.status === "PAUSED" || item.status === "DRAFT") return "amber";
  return "neutral";
}

function statusLabel(item: ListingItem) {
  if (item.moderationStatus === "REJECTED") return "Blocked";
  return item.status.charAt(0) + item.status.slice(1).toLowerCase();
}

export function DashboardListings({ items }: { items: ListingItem[] }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const counts = useMemo(
    () =>
      Object.fromEntries(filters.map((entry) => [entry.id, items.filter((item) => matches(item, entry.id)).length])) as Record<
        FilterId,
        number
      >,
    [items],
  );
  const visible = items.filter((item) => matches(item, filter));

  return (
    <section className="workspace-section dash-listings">
      <div className="section-heading">
        <div>
          <h2>Your listings</h2>
          <p>Filter by status, then pause, sell, or edit from here.</p>
        </div>
          <Link className="btn btn-primary" href="/listings/new">
            <Plus size={16} />
            New listing
          </Link>
      </div>
      {items.length ? (
        <>
          <div className="dash-filters" role="tablist" aria-label="Listing status">
            {filters.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={filter === entry.id}
                className={`dash-filter${filter === entry.id ? " is-on" : ""}`}
                onClick={() => setFilter(entry.id)}
              >
                {entry.label}
                <span>{counts[entry.id]}</span>
              </button>
            ))}
          </div>
          {visible.length ? (
            <div className="account-listings">
              {visible.map((item) => (
                <article
                  className={`account-listing${item.status === "SOLD" || item.status === "CLOSED" ? " is-done" : ""}`}
                  key={item.id}
                >
                  <Link
                    className="account-listing-photo"
                    href={`/listings/${item.id}`}
                    aria-label={`Preview ${item.title}`}
                  >
                    {item.media[0] ? (
                      <Image
                        src={`/api/media/${item.media[0].id}?size=thumb`}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <Package size={24} />
                    )}
                  </Link>
                  <div className="account-listing-info">
                    <p>{item.business?.publicName ?? "Personal listing"}</p>
                    <Link href={`/listings/${item.id}`}>
                      <h3>{item.title}</h3>
                    </Link>
                    <div className="account-listing-meta">
                      <strong>{money(item.priceCents)}</strong>
                      <StatusBadge tone={statusTone(item)}>{statusLabel(item)}</StatusBadge>
                    </div>
                  </div>
                  <div className="account-listing-actions">
                    {!["SOLD", "CLOSED"].includes(item.status) && (
                      <Link
                        className="account-listing-quiet"
                        href={`/listings/${item.id}/edit`}
                      >
                        <Pencil size={14} />
                        Edit
                      </Link>
                    )}
                    <Link className="account-listing-quiet" href={`/listings/${item.id}`}>
                      View
                    </Link>
                    {["DRAFT", "PAUSED"].includes(item.status) && (
                      <StatusButton
                        id={item.id}
                        target="PUBLISHED"
                        label="Publish"
                        className="account-listing-status"
                      />
                    )}
                    {item.status === "PUBLISHED" && (
                      <StatusButton
                        id={item.id}
                        target="PAUSED"
                        label="Pause"
                        className="account-listing-status"
                      />
                    )}
                    {["PUBLISHED", "PAUSED"].includes(item.status) && (
                      <StatusButton
                        id={item.id}
                        target="SOLD"
                        label="Sold"
                        className="account-listing-status"
                      />
                    )}
                    <DeleteListingButton listingId={item.id} title={item.title} compact />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="dash-empty-filter">Nothing in this group yet.</p>
          )}
        </>
      ) : (
        <div className="workspace-card">
          <EmptyListings locale="en" />
        </div>
      )}
    </section>
  );
}
