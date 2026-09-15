import { AuthForm } from "@/components/auth-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <>
      <main className="auth-card">
        <h1>Choose a new password.</h1>
        <AuthForm mode="reset" token={(await searchParams).token} />
      </main>
    </>
  );
}
