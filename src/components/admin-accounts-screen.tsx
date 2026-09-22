import { notFound } from "next/navigation";

import Link from "@/components/navigation-link";
import { AdminSuspensionControl } from "@/components/admin-suspension-control";
import { requireUser } from "@/lib/session";
import { isStaff } from "@/lib/permissions";
import {
    ADMIN_PAGE_SIZE,
    findAdminUsers,
    findAdminBusinesses,
} from "@/repositories/admin-accounts";

type Row = {
    id: string;
    name: string;
    email: string;
    detail: string;
    labels: string[];
    suspended: boolean;
    protectedAccount: boolean;
};

export async function AdminAccountsScreen({
    kind,
    query,
    page,
}: {
    kind: "user" | "business";
    query: string;
    page: number;
}) {
    const actor = await requireUser();

    if (!isStaff(actor)) notFound();

    let rows: Row[];
    let total: number;

    if (kind === "user") {
        const result = await findAdminUsers(query, page);
        total = result.total;

        rows = result.items.map((user) => {
            const labels: string[] = [];

            if (user.memberships.length === 0) {
                labels.push("Private");
            }

            if (user.memberships.some((item) => item.role === "OWNER")) {
                labels.push("Business owner");
            }

            if (user.memberships.some((item) => item.role === "MANAGER")) {
                labels.push("Business staff");
            }

            if (user.role !== "USER") {
                labels.push(user.role === "ADMIN" ? "Admin" : user.role);
            }

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                detail: user.memberships
                    .map((item) => `${item.business.publicName} (${item.role})`)
                    .join(", "),
                labels,
                suspended: Boolean(user.suspendedAt),
                protectedAccount: user.role === "ADMIN",
            };
        });
    } else {
        const result = await findAdminBusinesses(query, page);
        total = result.total;

        rows = result.items.map((business) => ({
            id: business.id,
            name: business.publicName,
            email: business.email,
            detail: [
                business.legalName,
                `Owners: ${business.memberships
                    .map((membership) => membership.user.name)
                    .join(", ") || "None"
                }`,
            ].join(" · "),
            labels: [business.reviewStatus],
            suspended: Boolean(business.suspendedAt),
            protectedAccount: false,
        }));
    }

    const basePath =
        kind === "user" ? "/admin/users" : "/admin/businesses";

    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    function pageUrl(value: number) {
        const params = new URLSearchParams({
            q: query,
            page: String(value),
        });

        return `${basePath}?${params}`;
    }

    return (
        <>
            <header className="workspace-heading">
                <p className="eyebrow">MARKETPLACE OPERATIONS</p>
                <h1>{kind === "user" ? "Users" : "Businesses"}</h1>
                <p className="muted">
                    Search accounts and manage suspension status.
                </p>
            </header>

            <form
                action={basePath}
                method="get"
                className="workspace-card flex flex-wrap items-end gap-3 mb-5"
            >
                <label className="field flex-1 min-w-0">
                    Search by name or email
                    <input
                        name="q"
                        defaultValue={query}
                        maxLength={100}
                        placeholder="Name or email"
                    />
                </label>

                <button className="btn btn-primary">Search</button>
                <Link href={basePath} className="btn btn-outline">
                    Clear
                </Link>
            </form>

            <p className="muted mb-3">{total} results</p>

            <div className="workspace-card overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-stone-200">
                            <th className="p-3">Account</th>
                            <th className="p-3">
                                {kind === "user" ? "Type / role" : "Approval"}
                            </th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.id}
                                className="border-b border-stone-100 align-top"
                            >
                                <td className="p-3">
                                    <strong>{row.name}</strong>
                                    <p className="muted break-all">{row.email}</p>

                                    {row.detail && (
                                        <p className="muted mt-1 text-xs">
                                            {row.detail}
                                        </p>
                                    )}
                                </td>

                                <td className="p-3">
                                    <div className="flex flex-wrap gap-2">
                                        {row.labels.map((label) => (
                                            <span
                                                key={label}
                                                className="rounded-full bg-stone-100 px-3 py-1 text-xs"
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </td>

                                <td className="p-3">
                                    <span
                                        className={
                                            row.suspended
                                                ? "text-red-700"
                                                : "text-green-700"
                                        }
                                    >
                                        {row.suspended ? "Suspended" : "Active"}
                                    </span>
                                </td>

                                <td className="p-3">
                                    <AdminSuspensionControl
                                        kind={kind}
                                        id={row.id}
                                        name={row.name}
                                        suspended={row.suspended}
                                        protectedAccount={row.protectedAccount}
                                    />
                                </td>
                            </tr>
                        ))}

                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center muted">
                                    No matching accounts.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <nav
                aria-label="Results pagination"
                className="flex items-center justify-between gap-3 mt-5"
            >
                {page > 1 ? (
                    <Link href={pageUrl(page - 1)} className="btn btn-outline">
                        Previous
                    </Link>
                ) : (
                    <span />
                )}

                <span className="muted text-sm">
                    Page {page} of {pages}
                </span>

                {page < pages ? (
                    <Link href={pageUrl(page + 1)} className="btn btn-outline">
                        Next
                    </Link>
                ) : (
                    <span />
                )}
            </nav>
        </>
    );
}