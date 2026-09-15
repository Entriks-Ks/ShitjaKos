import Link from "next/link";
import { SignOut } from "@/components/auth-form";
import { StatusButton } from "@/components/listing-form";
import { requireUser } from "@/lib/session";
import { getOwnedListings } from "@/repositories/dashboard";
import { money } from "@/lib/catalog";
export const metadata = { title: "My account", robots: { index: false, follow: false } };
export default async function Page() {
  const user = await requireUser();
  const items = await getOwnedListings(user.id);
  return (
    <>
      <main className="wrap py-10">
        <div className="flex justify-between gap-4 mb-7">
          <div>
            <p className="eyebrow">LLOGARIA IME</p>
            <h1>Hello, {user.name}.</h1>
            <p className="muted">Your listings, your businesses, one account.</p>
          </div>
          <div className="flex items-start gap-2">
            <SignOut />
            {user.role === "ADMIN" && (
              <Link href="/admin" className="btn btn-outline">
                Review queue
              </Link>
            )}
          </div>
        </div>
        <section className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            ["Your listings", items.length],
            [
              "Published & approved",
              items.filter(
                (i) => i.status === "PUBLISHED" && i.moderationStatus === "APPROVED",
              ).length,
            ],
            ["Businesses", user.memberships.length],
          ].map(([label, value]) => (
            <div className="panel" key={label}>
              <div className="muted">{label}</div>
              <div className="text-3xl font-semibold mt-3">{value}</div>
            </div>
          ))}
        </section>
        <div className="flex justify-between items-center mb-4">
          <h2>Your businesses</h2>
          <Link className="btn btn-outline" href="/business/new">
            Open a shop
          </Link>
        </div>
        {user.memberships.length ? (
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {user.memberships.map((m) => (
              <article className="panel" key={m.businessId}>
                <div className="flex justify-between gap-3">
                  <h3 className="font-semibold">{m.business.publicName}</h3>
                  <span className="pill">{m.role}</span>
                </div>
                <p className="muted mt-2">
                  {m.business.city} · Review: {m.business.reviewStatus}
                </p>
                {m.business.reviewStatus === "APPROVED" && (
                  <Link
                    className="text-sm underline mt-4 inline-block"
                    href={`/shops/${m.business.shop?.slug}`}
                  >
                    Visit shop
                  </Link>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="notice mb-10">
            You can sell privately now. Create a business when you’re ready to open a
            shop.
          </p>
        )}
        <div className="flex justify-between items-center mb-5">
          <h2>Manage listings</h2>
          <Link className="btn btn-primary" href="/listings/new">
            New listing
          </Link>
        </div>
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                className="panel flex flex-wrap justify-between gap-4"
                key={item.id}
              >
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="muted">
                    {money(item.priceCents)} ·{" "}
                    {item.business?.publicName ?? "Personal listing"} ·{" "}
                    {item.media.length} photos
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="pill">{item.status}</span>
                    <span className="pill">Review: {item.moderationStatus}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Link className="btn btn-outline" href={`/listings/${item.id}`}>
                    Preview
                  </Link>
                  {!["SOLD", "CLOSED"].includes(item.status) && (
                    <Link className="btn btn-outline" href={`/listings/${item.id}/edit`}>
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
          <div className="empty">
            <h2>A fresh start.</h2>
            <p className="muted mt-2">Create your first listing to get going.</p>
          </div>
        )}
      </main>
    </>
  );
}
