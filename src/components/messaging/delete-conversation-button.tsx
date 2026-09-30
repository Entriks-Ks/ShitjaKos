"use client";

import { useRouter } from "next/navigation";
import { DeleteConfirmation } from "@/components/delete-confirmation";
import { deleteConversationAction } from "@/actions/messaging";
import { refreshMessageNotifications } from "@/hooks/use-message-notifications";

export function DeleteConversationButton({
    conversationId,
    otherName,
}: {
    conversationId: string;
    otherName: string;
}) {
    const router = useRouter();

    return (
        <DeleteConfirmation
            compact
            label="Delete conversation"
            title="Delete this conversation?"
            itemName={otherName}
            description={
                "This removes the conversation only from your account. " +
                "The other participant will keep their copy. If a new message " +
                "is sent later, the conversation will return, but your deleted " +
                "message history will remain hidden."
            }
            onConfirm={async () => {
                const result =
                    await deleteConversationAction({
                        conversationId,
                    });

                return result.ok
                    ? {}
                    : {
                        error: result.error,
                    };
            }}
            onDeleted={() => {
                refreshMessageNotifications();
                router.replace("/dashboard/messages");
                router.refresh();
            }}
        />
    );
}