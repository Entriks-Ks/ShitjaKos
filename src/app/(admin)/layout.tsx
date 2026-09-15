import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { requireUser } from "@/lib/session";
import { isStaff } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireUser();
  if (!isStaff(actor)) notFound();

  return (
    <>
      <Header signedIn />
      {children}
    </>
  );
}
