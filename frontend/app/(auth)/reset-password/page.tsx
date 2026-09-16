import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ResetPasswordForm } from "@/components/PasswordResetForms";

export const metadata = {
  title: "Reset password — Robotics & Autonomous Systems Club",
};

// The token arrives as a query parameter from the emailed link, so this
// page cannot be statically prerendered.
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      designator="ACCOUNT RECOVERY"
      title="Set a new password"
      footer={
        <span>
          <Link href="/login">Back to sign in</Link>
        </span>
      }
    >
      <ResetPasswordForm token={token ?? null} />
    </AuthShell>
  );
}
