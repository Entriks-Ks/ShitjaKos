import { AuthForm } from "@/components/auth-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const { registered } = await searchParams;
  return (
    <>
      <h1>Your Connection to the Western Balkans Marketplaces</h1>
      <p className="muted mb-8">Log in or register</p>
      {registered === "1" && (
        <p role="status" className="notice mb-5">
          Your account is verified and ready. Sign in to continue.
        </p>
      )}
      <AuthForm mode="login" />
    </>
  );
}
