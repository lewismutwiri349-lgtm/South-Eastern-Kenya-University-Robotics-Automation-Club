"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import Link from "next/link";

// Kept in sync by hand with backend/src/routes/admin/roles.ts's
// ADMIN_STAFF_ROLES — the backend is the source of truth and enforces this
// independently; this only decides what the frontend shows.
const ADMIN_STAFF_ROLES = ["super_admin", "chairperson", "vice_chairperson", "secretary"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        const user = await getMe();
        if (user && ADMIN_STAFF_ROLES.includes(user.role)) {
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
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex gap-6">
            <Link href="/admin" className="font-semibold text-gray-800 hover:text-blue-600">
              Admin Dashboard
            </Link>
            <Link href="/admin/users" className="text-gray-600 hover:text-gray-800">
              Users
            </Link>
            <Link href="/admin/applications" className="text-gray-600 hover:text-gray-800">
              Applicants
            </Link>
          </div>
          <Link href="/account" className="text-sm text-gray-600 hover:text-gray-800">
            Settings
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
