"use client";

import { useRouter } from "next/navigation";
import { deleteListingAction } from "@/actions/listings";
import { DeleteConfirmation } from "@/components/delete-confirmation";

export function DeleteListingButton({
  listingId,
  compact = false,
  title,
}: {
  listingId: string;
  compact?: boolean;
  title?: string;
}) {
  const router = useRouter();
  return (
    <DeleteConfirmation
      label="Delete listing"
      title="Delete this listing?"
      itemName={title}
      compact={compact}
      description="This permanently removes the listing and its photos from the marketplace and saved favorites. This cannot be undone."
      onConfirm={() => deleteListingAction(listingId)}
      onDeleted={() => {
        if (!compact) router.replace("/dashboard");
        router.refresh();
      }}
    />
  );
}
