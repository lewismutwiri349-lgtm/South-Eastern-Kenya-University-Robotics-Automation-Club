import { AuthShell } from "@/components/AuthShell";
import { VerifyEmailClient } from "@/components/VerifyEmailClient";

export const metadata = {
  title: "Verify email — Robotics & Autonomous Systems Club",
};

// The token arrives as a query parameter from the emailed link.
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell designator="ACCOUNT SETUP" title="Verify your email">
      <VerifyEmailClient token={token ?? null} />
    </AuthShell>
  );
}
