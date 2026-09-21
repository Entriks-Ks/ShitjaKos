import { AuthForm } from "@/components/auth-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <>
      <h1>Choose a new password.</h1>
      <p className="muted mb-8">Pick something only you will know.</p>
      <AuthForm mode="reset" token={(await searchParams).token} />
    </>
  );
}
