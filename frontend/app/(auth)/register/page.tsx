import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata = {
  title: "Register — Robotics & Autonomous Systems Club",
};

export default function RegisterPage() {
  return (
    <AuthShell
      designator="JOIN THE CLUB"
      title="Create an account"
      intro="Registering creates a visitor account. Applying for membership comes later, from inside the applicant portal."
      footer={
        <span>
          Already registered? <Link href="/login">Sign in</Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
