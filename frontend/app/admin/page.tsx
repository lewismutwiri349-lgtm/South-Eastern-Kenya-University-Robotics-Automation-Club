"use client";

import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users, review applicants, and (soon) moderate club content.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/users"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-blue-600"
        >
          <h3 className="text-lg font-semibold mb-2">👥 Users</h3>
          <p className="text-gray-600 text-sm">View the full roster, search by name or email, and grant roles</p>
        </Link>

        <Link
          href="/admin/applications"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-green-600"
        >
          <h3 className="text-lg font-semibold mb-2">📋 Applicants</h3>
          <p className="text-gray-600 text-sm">Review interviewed applicants and accept or reject them</p>
        </Link>
      </div>
    </div>
  );
}
