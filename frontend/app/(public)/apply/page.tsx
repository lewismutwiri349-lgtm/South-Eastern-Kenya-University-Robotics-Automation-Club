import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

export const metadata = {
  title: "Apply to join - Robotics & Autonomous Systems Club",
};

export default function ApplyPage() {
  return (
    <AuthShell
      designator="MEMBERSHIP APPLICATION"
      title="Start your application"
      intro="Create a visitor account first. Once you are signed in, the applicant portal will guide you through the membership application."
      footer={
        <span>
          Already have an account? <Link href="/login">Sign in</Link>
        </span>
      }
    >
      <Link
        href="/register"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          padding: "10px 20px",
          border: "1px solid var(--accent)",
          borderRadius: "var(--radius-md)",
          background: "var(--accent)",
          color: "var(--accent-contrast)",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Create an account
      </Link>
    </AuthShell>
  );
}