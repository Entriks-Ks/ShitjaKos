import Link from "@/components/navigation-link";
import { requireUser } from "@/lib/session";
import {
  getBusinessPerformance,
  PerformanceError,
} from "@/services/business-performance";

export default async function PerformanceScreen({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const actor = await requireUser();
  const { id } = await params;
  let data;
  try {
    data = await getBusinessPerformance(actor, id, await searchParams);
  } catch (error) {
    if (!(error instanceof PerformanceError)) throw error;
    return (
      <div className="wrap py-12">
        <p role="alert" className="notice error">
          {error.message}
        </p>
        <Link href={`/dashboard/performance?business=${id}`} className="btn btn-outline">
          Reset dates
        </Link>
        <Link href="/dashboard/shops" className="btn btn-outline">
          My shops
        </Link>
      </div>
    );
  }
  const metrics = [
    ["Listing views", data.listingViews],
    ["Shop views", data.shopViews],
    ["Saved favorites", data.favorites],
    ["New inquiries", data.conversations],
    ["Buyer messages", data.messages],
  ] as const;
  const peak = Math.max(1, ...data.daily.map((day) => day.views));
  return (
    <div className="space-y-6">
      <header className="workspace-heading">
        <Link href="/dashboard/shops" className="text-action">
          ← My shops
        </Link>
        <p className="eyebrow mt-6">BUSINESS INSIGHTS</p>
        <h1>{data.name}</h1>
        <p className="muted">See how customers discover and contact your shop.</p>
      </header>
      <form
        method="get"
        action="/dashboard/performance"
        className="workspace-card flex flex-wrap items-end gap-4"
      >
        <input type="hidden" name="business" value={id} />
        <label className="field">
          From
          <input
            type="date"
            name="from"
            required
            defaultValue={data.from}
            max={data.to}
          />
        </label>
        <label className="field">
          To
          <input
            type="date"
            name="to"
            required
            defaultValue={data.to}
            max={new Date().toISOString().slice(0, 10)}
          />
        </label>
        <button className="btn btn-primary">Apply dates</button>
      </form>
      <section
        aria-label="Performance totals"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {metrics.map(([label, value]) => (
          <article className="workspace-card" key={label}>
            <p className="muted text-sm">{label}</p>
            <p className="text-3xl font-semibold mt-3">{value.toLocaleString("en-GB")}</p>
          </article>
        ))}
      </section>
      <section className="workspace-card">
        <h2 className="text-xl font-semibold">Views over time</h2>
        <p className="muted text-sm mb-5">Shop and listing views combined · UTC dates</p>
        {data.daily.length ? (
          <div className="max-h-72 overflow-auto space-y-2">
            {data.daily.map((day) => (
              <div key={day.day} className="flex items-center gap-3 text-sm">
                <time className="w-24 shrink-0">{day.day}</time>
                <div className="flex-1 bg-stone-100 rounded-full">
                  <div
                    className="h-3 bg-stone-800 rounded-full"
                    style={{ width: `${(day.views / peak) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right">{day.views}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted py-8">No recorded views in this period yet.</p>
        )}
      </section>
      <section className="workspace-card overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">Most viewed listings</h2>
        <table className="w-full text-sm text-left">
          <thead>
            <tr>
              <th className="p-3">Listing</th>
              <th className="p-3">Views</th>
              <th className="p-3">Saved favorites</th>
              <th className="p-3">New inquiries</th>
            </tr>
          </thead>
          <tbody>
            {data.popular.map((item) => (
              <tr key={item.id} className="border-t border-stone-100">
                <td className="p-3">
                  {item.title}
                  <span className="block muted text-xs">{item.status}</span>
                </td>
                <td className="p-3">{item.views}</td>
                <td className="p-3">{item.favorites}</td>
                <td className="p-3">{item.inquiries}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.popular.length && (
          <p className="muted py-6">Your most viewed listings will appear here.</p>
        )}
      </section>
      <aside className="workspace-card text-sm muted space-y-2">
        <p>
          Views count signed-in visitors once per page per UTC day. Your own visits, staff
          visits and administrator visits are excluded. Anonymous visits are not counted.
          View tracking begins when this feature is enabled.
        </p>
        <p>
          Saved favorites are favorites added during the selected period that are still
          saved. New inquiries count conversations started during the period; buyer
          messages include replies in existing conversations. These are contact
          indicators, not completed sales.
        </p>
        <p>
          No visitor identities, IP addresses, message content or browsing histories are
          shown. Popular listings are ranked by recorded views. Days with no views are
          omitted from the chart.
        </p>
      </aside>
    </div>
  );
}
