import Link from "@/components/navigation-link";
import {
  Eye,
  Heart,
  MessageCircle,
  MessagesSquare,
  Store,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import {
  getBusinessPerformance,
  PerformanceError,
} from "@/services/business-performance";

const metricMeta = [
  ["Listing views", "listingViews", Eye],
  ["Shop views", "shopViews", Store],
  ["Saved favorites", "favorites", Heart],
  ["New inquiries", "conversations", MessageCircle],
  ["Buyer messages", "messages", MessagesSquare],
] as const;

function shortDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

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
      <div className="perf-error">
        <p role="alert" className="notice error">
          {error.message}
        </p>
        <div className="perf-error-actions">
          <Link href={`/dashboard/performance?business=${id}`} className="btn btn-outline">
            Reset dates
          </Link>
          <Link href="/dashboard/shops" className="btn btn-outline">
            My shops
          </Link>
        </div>
      </div>
    );
  }
  const totals = {
    listingViews: data.listingViews,
    shopViews: data.shopViews,
    favorites: data.favorites,
    conversations: data.conversations,
    messages: data.messages,
  };
  const peak = Math.max(1, ...data.daily.map((day) => day.views));
  return (
    <div className="perf-screen">
      <header className="workspace-heading">
        <Link href="/dashboard/shops" className="text-action">
          ← My shops
        </Link>
        <p className="eyebrow mt-5">BUSINESS INSIGHTS</p>
        <h1>{data.name}</h1>
        <p className="muted">How people find and contact this shop.</p>
      </header>

      <form
        method="get"
        action="/dashboard/performance"
        className="perf-dates"
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
        <button className="btn btn-primary">Apply</button>
      </form>

      <section aria-label="Performance totals" className="perf-metrics">
        {metricMeta.map(([label, key, Icon]) => (
          <article className="perf-metric" key={key}>
            <span className="perf-metric-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <strong>{totals[key].toLocaleString("en-GB")}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section className="perf-panel">
        <div className="perf-panel-head">
          <h2>Views over time</h2>
          <p>Shop and listing views · UTC</p>
        </div>
        {data.daily.length ? (
          <ol className="perf-chart">
            {data.daily.map((day) => (
              <li key={day.day}>
                <time dateTime={day.day}>{shortDay(day.day)}</time>
                <div className="perf-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(6, (day.views / peak) * 100)}%` }} />
                </div>
                <span className="perf-bar-value">{day.views}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="perf-empty">No recorded views in this period yet.</p>
        )}
      </section>

      <section className="perf-panel">
        <div className="perf-panel-head">
          <h2>Most viewed listings</h2>
          <p>Ranked by views in this period</p>
        </div>
        {data.popular.length ? (
          <ul className="perf-listings">
            {data.popular.map((item, index) => (
              <li key={item.id}>
                <span className="perf-rank">{index + 1}</span>
                <div>
                  <Link href={`/listings/${item.id}`}>{item.title}</Link>
                  <small>{item.status.charAt(0) + item.status.slice(1).toLowerCase()}</small>
                </div>
                <dl>
                  <div>
                    <dt>Views</dt>
                    <dd>{item.views}</dd>
                  </div>
                  <div>
                    <dt>Saved</dt>
                    <dd>{item.favorites}</dd>
                  </div>
                  <div>
                    <dt>Inquiries</dt>
                    <dd>{item.inquiries}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className="perf-empty">Your most viewed listings will appear here.</p>
        )}
      </section>

      <details className="perf-notes">
        <summary>How these numbers are counted</summary>
        <p>
          Views estimate daily unique visitors per page, including guests. Signed-in
          owners, staff and administrators are excluded. Logged-out sellers may count.
          Daily counts added together are not unique people across the whole period.
          Guest counts begin when guest tracking is enabled; earlier counts only include
          signed-in visitors.
        </p>
        <p>
          Saved favorites are favorites added during the selected period that are still
          saved. New inquiries count conversations started during the period; buyer
          messages include replies in existing conversations. These are contact
          indicators, not completed sales.
        </p>
        <p>
          Private browsing, cookie resets and signing in after a guest visit can add an
          extra count. Browser privacy opt-outs are respected. No visitor identities, IP
          addresses or message content are shown. Popular listings are ranked by recorded
          views. Days with no views are omitted from the chart.
        </p>
      </details>
    </div>
  );
}
