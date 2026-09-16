import Link from "@/components/navigation-link";
import { notFound } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import {
  Store,
  ClipboardCheck,
  History,
  ArrowUpRight,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { getReviewQueue } from "@/repositories/reviews";
import { StatCard, StatusBadge, EmptyState } from "@/components/workspace-ui";
import { ReviewForm } from "@/components/admin-review-form";

export const metadata = {
  title: "Review queue",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await requireUser();
  if (!isStaff(user)) notFound();
  const { businesses, audits } = await getReviewQueue(user.id);
  return (
    <>
      <header className="workspace-heading heading-with-action">
        <div>
          <p className="eyebrow">MARKETPLACE OPERATIONS</p>
          <h1>A little care. A better marketplace.</h1>
          <p className="muted">Review new shop applications and welcome businesses.</p>
        </div>
        <Link href="/admin/catalog" className="btn btn-outline">
          Manage catalog <ArrowUpRight size={16} />
        </Link>
      </header>
      <div className="workspace-stats">
        <StatCard
          icon={ClipboardCheck}
          label="Ready for your review"
          value={businesses.length}
          note="Shop applications you can independently review"
        />
        <StatCard
          icon={Store}
          label="Business applications"
          value={businesses.length}
          note="Shops waiting to join the marketplace"
        />
      </div>
      <nav className="review-jump-links" aria-label="Review sections">
        <a href="#business-queue">
          <Store size={16} />
          Businesses <span>{businesses.length}</span>
        </a>
        <a href="#activity">
          <History size={16} />
          Activity
        </a>
      </nav>
      <section id="business-queue" className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Business applications</h2>
            <p>Review each shop’s identity and contact details.</p>
          </div>
        </div>
        <div className="space-y-4">
          {businesses.map((business) => (
            <article className="workspace-card review-card" key={business.id}>
              <div className="section-heading">
                <div className="flex items-center gap-3">
                  <span className="shop-emblem">
                    <Store size={24} />
                  </span>
                  <div>
                    <h3>{business.publicName}</h3>
                    <p>Legal name: {business.legalName}</p>
                  </div>
                </div>
                <StatusBadge tone="amber">Awaiting review</StatusBadge>
              </div>
              <div className="business-review-details">
                <span>
                  <MapPin size={15} />
                  {business.city}
                </span>
                <span>
                  <Mail size={15} />
                  {business.email}
                </span>
                <span>
                  <Phone size={15} />
                  {business.phone}
                </span>
              </div>
              <p className="review-description">{business.description}</p>
              <ReviewForm id={business.id} kind="business" />
            </article>
          ))}
          {!businesses.length && (
            <div className="workspace-card">
              <EmptyState icon={Store} title="No applications waiting for you.">
                New businesses appear here for independent review. Applications for your
                own shops are reviewed by another admin.
              </EmptyState>
            </div>
          )}
        </div>
      </section>
      <section id="activity" className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Recent activity</h2>
            <p>The latest account, catalog, and moderation changes.</p>
          </div>
          <History size={20} />
        </div>
        <div className="workspace-card activity-card">
          {audits.length ? (
            <ol className="activity-list">
              {audits.map((event) => (
                <li key={event.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>
                      {event.action.replaceAll(".", " · ").replaceAll("-", " ")}
                    </strong>
                    <p>
                      {event.actor.name}
                      <span> · </span>
                      <time dateTime={event.createdAt.toISOString()}>
                        {event.createdAt.toLocaleString("en-GB")}
                      </time>
                    </p>
                    <small>Reference: {event.targetId}</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={History} title="Your activity log starts here.">
              Changes will appear as the marketplace grows.
            </EmptyState>
          )}
        </div>
      </section>
    </>
  );
}
