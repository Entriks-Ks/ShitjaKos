"use client";

import { useRouter } from "next/navigation";
import { deleteBusinessAction } from "@/actions/businesses";
import { DeleteConfirmation } from "@/components/delete-confirmation";

export function DeleteBusinessButton({
  businessId,
  name,
}: {
  businessId: string;
  name: string;
}) {
  const router = useRouter();
  return (
    <DeleteConfirmation
      label="Delete shop"
      title="Delete this shop?"
      itemName={name}
      description="This permanently removes the shop and its business profile. Delete all of its listings first. Your personal account will remain. This cannot be undone."
      onConfirm={() => deleteBusinessAction(businessId)}
      onDeleted={() => router.refresh()}
    />
  );
}
