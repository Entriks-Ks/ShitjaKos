import "server-only";

import { sendAuthMail } from "@/lib/mail";

export async function sendBusinessStaffInvitationMail(email: string) {
    const baseUrl = process.env.BETTER_AUTH_URL;

    if (!baseUrl) {
        throw new Error("The website URL is not configured.");
    }

    const url = new URL("/dashboard/shops", baseUrl);

    await sendAuthMail(
        email,
        "You have been invited to join a business on ShitjaKos",
        [
            "A business owner has invited you to join their team as staff.",
            "",
            "Sign in or register using this email address.",
            "Then open My shops to review and accept the invitation:",
            url.toString(),
            "",
            "The invitation expires after seven days.",
            "Accept only if you recognize the business.",
        ].join("\n"),
    );
}