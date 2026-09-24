import Link from "@/components/navigation-link";
import { Plus, Store, MapPin, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/workspace-ui";
import type { requireUser } from "@/lib/session";
import { ShopCardMenu } from "@/components/shop-card-menu";

type Memberships = Awaited<ReturnType<typeof requireUser>>["memberships"];

export function AccountShops({ memberships }: { memberships: Memberships }) {
  return (
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
      {memberships.length ? (
        <div className="shop-account-grid">
          {memberships.map(({ business, role }) => (
            <article className="workspace-card shop-account-card" key={business.id}>
              <span className="shop-emblem">
                <Store size={23} />
              </span>
              <div className="shop-account-details">
                <h3>
                  {business.reviewStatus === "APPROVED" &&
                  business.shop &&
                  !business.suspendedAt ? (
                    <Link
                      className="shop-account-title-link"
                      href={`/shops/${business.shop.slug}`}
                    >
                      {business.publicName}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  ) : (
                    business.publicName
                  )}
                </h3>
                <p>
                  <MapPin size={13} />
                  {business.city} · {role === "OWNER" ? "Owner" : "Staff"}
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
              {role === "OWNER" && (
                <ShopCardMenu
                  businessId={business.id}
                  name={business.publicName}
                  suspended={Boolean(business.suspendedAt)}
                />
              )}
              {business.reviewStatus !== "APPROVED" && (
                <small className="shop-account-review-note">
                  {business.reviewStatus === "PENDING"
                    ? "Your shop will be public once its review is complete."
                    : "This shop is not public because its review was declined."}
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
  );
}
