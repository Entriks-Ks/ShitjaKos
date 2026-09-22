import { AdminAccountsScreen } from "@/components/admin-accounts-screen";

export const metadata = {
    title: "Manage users",
    robots: { index: false, follow: false },
};

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{
        q?: string;
        page?: string;
    }>;
}) {
    const params = await searchParams;
    const requestedPage = Number(params.page);

    const page =
        Number.isSafeInteger(requestedPage) && requestedPage > 0
            ? Math.min(requestedPage, 100_000)
            : 1;

    return (
        <AdminAccountsScreen
            kind="user"
            query={(params.q ?? "").trim().slice(0, 100)}
            page={page}
        />
    );
}