import { VerifyEmailForm } from "@/components/verify-email-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; registration?: string }>;
}) {
  const { email, registration } = await searchParams;

  return (
    <>
      <h1>Verify your email</h1>
      <p className="muted mb-8">
        Enter the six-digit code we sent you. The code expires after five minutes.
      </p>
      <VerifyEmailForm initialEmail={email ?? ""} registrationId={registration ?? ""} />
    </>
  );
}
