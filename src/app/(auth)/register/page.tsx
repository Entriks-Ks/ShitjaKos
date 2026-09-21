import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return (
    <>
      <h1>One account. More possibilities.</h1>
      <p className="muted mb-8">Create an account to buy and sell.</p>
      <AuthForm mode="register" />
    </>
  );
}
