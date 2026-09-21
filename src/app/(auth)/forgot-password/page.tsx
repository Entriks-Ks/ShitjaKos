import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return (
    <>
      <h1>Reset your password.</h1>
      <p className="muted mb-8">We will send a secure reset link.</p>
      <AuthForm mode="forgot" />
    </>
  );
}
