import { AuthForm } from "@/components/auth-form";
export default function Page() {
  return (
    <>
      <main className="auth-card">
        <p className="eyebrow">BËHU PJESË E KOMUNITETIT</p>
        <h1>One account. More possibilities.</h1>
        <p className="muted mb-8">
          Buy and sell privately, or open a shop with the same account.
        </p>
        <AuthForm mode="register" />
      </main>
    </>
  );
}
