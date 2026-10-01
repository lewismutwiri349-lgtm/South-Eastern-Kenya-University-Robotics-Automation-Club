"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAdminApplications, type AdminApplication } from "@/lib/admin-api";

const STATUSES = [
  "draft",
  "submitted",
  "testing",
  "test_passed",
  "test_failed",
  "interview_scheduled",
  "interviewed",
  "accepted",
  "rejected",
];

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("interviewed");

  useEffect(() => {
    setLoading(true);
    setError(null);
    listAdminApplications({ status: status || undefined })
      .then((res) => setApplications(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load applications"))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Applicants</h1>
        <p className="text-gray-600">Review applicants and accept or reject them after their interview.</p>
      </div>

      <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2">
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>}

      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {applications.map((app) => (
            <Link
              key={app.id}
              href={`/admin/applications/${app.id}`}
              className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition"
            >
              <div>
                <p className="font-semibold">
                  {app.firstName} {app.lastName}
                </p>
                <p className="text-sm text-gray-600">{app.email}</p>
              </div>
              <span className="px-2 py-1 rounded bg-gray-100 text-sm">{app.status}</span>
            </Link>
          ))}
          {applications.length === 0 && <p className="px-4 py-6 text-center text-gray-500">No applications found.</p>}
        </div>
      )}
    </div>
  );
}
