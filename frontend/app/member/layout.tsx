"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import Link from "next/link";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        const user = await getMe();
        // Allow both "member" and "applicant" roles (applicants can view member features)
        if (user && (user.role === "member" || user.role === "applicant")) {
          setAuthenticated(true);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex gap-6">
            <Link href="/member" className="font-semibold text-gray-800 hover:text-blue-600">
              Member Portal
            </Link>
            <Link href="/member/profile" className="text-gray-600 hover:text-gray-800">
              Profile
            </Link>
            <Link href="/member/card" className="text-gray-600 hover:text-gray-800">
              Membership Card
            </Link>
            <Link href="/member/achievements" className="text-gray-600 hover:text-gray-800">
              Achievements
            </Link>
          </div>
          <Link href="/account" className="text-sm text-gray-600 hover:text-gray-800">
            Settings
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
