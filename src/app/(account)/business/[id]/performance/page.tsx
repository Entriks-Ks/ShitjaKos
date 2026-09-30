import { redirect } from "next/navigation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { from, to } = await searchParams;
  const query = new URLSearchParams({ business: id });
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  redirect(`/dashboard/performance?${query}`);
}
