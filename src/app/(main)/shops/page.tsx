import Link from "next/link";
import { Store, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import { getPublicShops } from "@/repositories/shops";
import { currentUser } from "@/lib/session";
import { localeOf } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const locale = localeOf((await searchParams).lang);
  const [user, shops] = await Promise.all([currentUser(), getPublicShops()]);
  return (
    <>
      <Header locale={locale} signedIn={!!user} />
      <main className="wrap py-12">
        <p className="eyebrow">BIZNESE NGA KOMUNITETI</p>
        <h1>Local shops. Real people.</h1>
        <p className="muted mb-8">Explore reviewed businesses across Kosovo.</p>
        {shops.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shops.map((s) => (
              <Link className="panel" href={`/shops/${s.slug}?lang=${locale}`} key={s.id}>
                <Store className="text-emerald-800 mb-5" />
                <h2>{s.business.publicName}</h2>
                <p className="muted mt-2 line-clamp-2">{s.business.description}</p>
                <div className="flex justify-between mt-5 text-sm">
                  <span>{s.business.city}</span>
                  <ArrowUpRight size={17} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>Your neighborhood is growing.</h2>
            <p className="muted my-4">Be one of the first businesses to open a shop.</p>
            <Link className="btn btn-primary" href="/business/new">
              Open a shop
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
