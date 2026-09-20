import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Sign in — Robotics & Autonomous Systems Club",
};

export default function LoginPage() {
  return (
    <AuthShell
      designator="MEMBER ACCESS"
      title="Sign in"
      footer={
        <>
          <span>
            No account yet? <Link href="/register">Register</Link>
          </span>
          <span>
            <Link href="/forgot-password">Forgot your password?</Link>
          </span>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
