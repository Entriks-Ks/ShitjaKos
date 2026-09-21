import { AuthForm } from "@/components/auth-form";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <>
      <h1>One account. More possibilities.</h1>
      <p className="muted mb-8">Create an account to buy and sell.</p>
      <AuthForm mode="register" />
    </>
  );
}
