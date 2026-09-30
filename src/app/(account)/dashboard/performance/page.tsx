import Link from "@/components/navigation-link";
import { requireUser } from "@/lib/session";
import PerformanceScreen from "@/components/business-performance/performance-screen";
export const metadata = {
  title: "Shop performance",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const shops = user.memberships.filter(
    ({ role, business }) => role === "OWNER" && !business.suspendedAt,
  );
  if (!shops.length)
    return (
      <div className="workspace-card">
        <h1>Performance</h1>
        <p className="muted">Performance is available for shops you own.</p>
        <Link href="/dashboard/shops" className="text-action">
          My shops
        </Link>
      </div>
    );
  const selected =
    shops.find(({ business }) => business.id === query.business) ?? shops[0];
  return (
    <>
      {shops.length > 1 && (
        <nav aria-label="Choose shop performance" className="flex flex-wrap gap-2 mb-6">
          {shops.map(({ business }) => (
            <Link
              key={business.id}
              href={`/dashboard/performance?business=${business.id}`}
              className={
                business.id === selected.business.id
                  ? "btn btn-primary"
                  : "btn btn-outline"
              }
              aria-current={business.id === selected.business.id ? "page" : undefined}
            >
              {business.publicName}
            </Link>
          ))}
        </nav>
      )}
      <PerformanceScreen
        params={Promise.resolve({ id: selected.business.id })}
        searchParams={Promise.resolve({ from: query.from, to: query.to })}
      />
    </>
  );
}
