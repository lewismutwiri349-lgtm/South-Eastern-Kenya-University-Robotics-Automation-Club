import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { RequestPasswordResetForm } from "@/components/PasswordResetForms";

export const metadata = {
  title: "Forgot password — Robotics & Autonomous Systems Club",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      designator="ACCOUNT RECOVERY"
      title="Forgot your password?"
      intro="Enter your email and we'll send you a link to set a new one."
      footer={
        <span>
          Remembered it? <Link href="/login">Sign in</Link>
        </span>
      }
    >
      <RequestPasswordResetForm />
    </AuthShell>
  );
}
