import { requireUser } from "@/lib/session";
import { getChatInbox } from "@/services/messaging";
import { MessagingInbox } from "@/components/messaging/inbox";

export const metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await requireUser();
  const requested = Number((await searchParams).page ?? "1");
  const page =
    Number.isSafeInteger(requested) && requested > 0 && requested <= 10000
      ? requested
      : 1;
  const initial = await getChatInbox(actor, page);
  return (
    <>
      <header className="workspace-heading">
        <h1>Messages</h1>
        <p className="muted">Your personal conversations and business inboxes.</p>
      </header>
      <MessagingInbox key={page} initial={initial} page={page} />
    </>
  );
}
