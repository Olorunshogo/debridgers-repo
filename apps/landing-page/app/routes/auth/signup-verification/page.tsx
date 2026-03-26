import { redirect } from "next/navigation";
import SignupVerificationClient from "./SignupVerificationClient";

export default async function SignupVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = params.email;

  if (!email) {
    redirect("/signup");
  }
  return <SignupVerificationClient email={email} />;
}
