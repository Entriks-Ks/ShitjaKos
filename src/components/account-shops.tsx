import Link from "@/components/navigation-link";
import { Plus, Store, MapPin, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/workspace-ui";
import type { requireUser } from "@/lib/session";

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
  );
}
