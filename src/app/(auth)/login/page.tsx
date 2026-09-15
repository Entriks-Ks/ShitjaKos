import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return (
    <>
      <main className="auth-card">
        <p className="eyebrow">MIRË SE U KTHEVE</p>
        <h1>Welcome back.</h1>
        <p className="muted mb-8">Your next great find is waiting.</p>
        <AuthForm mode="login" />
      </main>
    </>
  );
}
