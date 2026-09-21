import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return (
    <>
      <h1>Your Connection to the Western Balkans Marketplaces</h1>
      <p className="muted mb-8">Log in or register</p>
      <AuthForm mode="login" />
    </>
  );
}
