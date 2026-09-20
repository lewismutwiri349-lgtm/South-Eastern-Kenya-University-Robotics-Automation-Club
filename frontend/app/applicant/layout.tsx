"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

/**
 * Protected layout for applicant portal.
 * Requires:
 * - Authenticated session (role === "applicant")
 * - Email verified
 */
export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getMe();

        // Check role
        if (user.role !== "applicant" && user.role !== "member") {
          router.push("/login");
          return;
        }

        // Check email verification
        if (!user.emailVerifiedAt) {
          router.push("/verify-email?redirect=/applicant");
          return;
        }

        setAuthorized(true);
      } catch {
        // Not authenticated
        router.push("/login?redirect=/applicant");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
