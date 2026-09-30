import {
    Flag,
    MessageSquareWarning,
    UserRound,
} from "lucide-react";

import Link from "@/components/navigation-link";
import { AdminMessageReportControl } from "@/components/admin-message-report-control";
import {
    findAdminMessageReports,
    MESSAGE_REPORT_PAGE_SIZE,
    type MessageReportStatus,
} from "@/repositories/admin-message-reports";

export const metadata = {
    title: "Message reports",
    robots: {
        index: false,
        follow: false,
    },
};

function parseStatus(
    value: string | undefined,
): MessageReportStatus {
    if (value === "RESOLVED") {
        return "RESOLVED";
    }

    if (value === "DISMISSED") {
        return "DISMISSED";
    }

    return "OPEN";
}

export default async function MessageReportsPage({
    searchParams,
}: {
    searchParams: Promise<{
        status?: string;
        page?: string;
    }>;
}) {
    const params = await searchParams;
    const status = parseStatus(
        params.status?.toUpperCase(),
    );

    const requestedPage = Number(params.page);

    const page =
        Number.isSafeInteger(requestedPage) &&
            requestedPage > 0
            ? Math.min(requestedPage, 100_000)
            : 1;

    const result = await findAdminMessageReports(
        status,
        page,
    );

    const totalPages = Math.max(
        1,
        Math.ceil(
            result.total /
            MESSAGE_REPORT_PAGE_SIZE,
        ),
    );

    function pageUrl(value: number) {
        const query = new URLSearchParams({
            status,
            page: String(value),
        });

        return `/admin/message-reports?${query}`;
    }

    return (
        <>
            <header className="workspace-heading">
                <p className="eyebrow">
                    MARKETPLACE SAFETY
                </p>

                <h1>Message reports</h1>

                <p className="muted">
                    Review messages reported by marketplace
                    participants.
                </p>
            </header>

            <nav
                className="review-jump-links"
                aria-label="Message report status"
            >
                <Link
                    href="/admin/message-reports?status=OPEN"
                    aria-current={
                        status === "OPEN"
                            ? "page"
                            : undefined
                    }
                >
                    <MessageSquareWarning size={16} />
                    Open
                </Link>

                <Link
                    href="/admin/message-reports?status=RESOLVED"
                    aria-current={
                        status === "RESOLVED"
                            ? "page"
                            : undefined
                    }
                >
                    Resolved
                </Link>

                <Link
                    href="/admin/message-reports?status=DISMISSED"
                    aria-current={
                        status === "DISMISSED"
                            ? "page"
                            : undefined
                    }
                >
                    Dismissed
                </Link>
            </nav>

            <p className="muted mb-3">
                {result.total}{" "}
                {status.toLowerCase()} reports
            </p>

            <div className="space-y-4">
                {result.items.map((report) => (
                    <article
                        key={report.id}
                        className="workspace-card"
                    >
                        <div className="section-heading">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Flag size={18} />

                                    <h2>
                                        {report.conversation.listingTitle}
                                    </h2>
                                </div>

                                <p>
                                    Reported{" "}
                                    <time
                                        dateTime={
                                            report.createdAt.toISOString()
                                        }
                                    >
                                        {report.createdAt.toLocaleString(
                                            "en-GB",
                                        )}
                                    </time>
                                </p>
                            </div>

                            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold">
                                {report.status}
                            </span>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            <section>
                                <p className="eyebrow">
                                    REPORTED MESSAGE
                                </p>

                                <blockquote className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
                                    {report.message.body}
                                </blockquote>

                                <div className="mt-3 flex items-start gap-2 text-sm">
                                    <UserRound size={16} />

                                    <div>
                                        <strong>
                                            {report.message.sender.name}
                                        </strong>

                                        <p className="muted break-all">
                                            {report.message.sender.email}
                                        </p>

                                        {report.message.sender
                                            .suspendedAt && (
                                                <p className="text-red-700">
                                                    User suspended
                                                </p>
                                            )}
                                    </div>
                                </div>
                            </section>

                            <section>
                                <p className="eyebrow">
                                    REPORT INFORMATION
                                </p>

                                <div className="mt-2 rounded-xl border border-stone-200 p-4">
                                    <strong>Reason</strong>

                                    <p className="mt-2 whitespace-pre-wrap">
                                        {report.reason}
                                    </p>

                                    <hr className="my-4 border-stone-200" />

                                    <strong>Reported by</strong>

                                    <p>
                                        {report.reporter.name}
                                    </p>

                                    <p className="muted break-all">
                                        {report.reporter.email}
                                    </p>
                                </div>
                            </section>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-5">
                            <div className="flex flex-wrap gap-2">
                                {report.conversation.listingId && (
                                    <Link
                                        href={`/listings/${report.conversation.listingId}`}
                                        className="btn btn-outline"
                                    >
                                        View listing
                                    </Link>
                                )}

                                <Link
                                    href={`/admin/users?q=${encodeURIComponent(
                                        report.message.sender.email,
                                    )}`}
                                    className="btn btn-outline"
                                >
                                    Review sender account
                                </Link>
                            </div>

                            {report.status === "OPEN" && (
                                <AdminMessageReportControl
                                    reportId={report.id}
                                    messagePreview={
                                        report.message.body.length > 120
                                            ? `${report.message.body.slice(
                                                0,
                                                120,
                                            )}…`
                                            : report.message.body
                                    }
                                />
                            )}
                        </div>
                    </article>
                ))}

                {result.items.length === 0 && (
                    <div className="workspace-card p-8 text-center">
                        <MessageSquareWarning
                            size={32}
                            className="mx-auto mb-3"
                        />

                        <h2>No {status.toLowerCase()} reports</h2>

                        <p className="muted mt-1">
                            Reports with this status will appear
                            here.
                        </p>
                    </div>
                )}
            </div>

            <nav
                aria-label="Message report pagination"
                className="mt-5 flex items-center justify-between gap-3"
            >
                {page > 1 ? (
                    <Link
                        href={pageUrl(page - 1)}
                        className="btn btn-outline"
                    >
                        Previous
                    </Link>
                ) : (
                    <span />
                )}

                <span className="muted text-sm">
                    Page {page} of {totalPages}
                </span>

                {page < totalPages ? (
                    <Link
                        href={pageUrl(page + 1)}
                        className="btn btn-outline"
                    >
                        Next
                    </Link>
                ) : (
                    <span />
                )}
            </nav>
        </>
    );
}