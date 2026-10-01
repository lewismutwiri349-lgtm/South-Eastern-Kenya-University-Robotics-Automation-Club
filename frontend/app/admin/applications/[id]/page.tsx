"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdminApplication, acceptApplication, rejectApplication, type AdminApplication } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

// Mirrors ACCEPT_FROM_STATUSES / REJECT_FROM_STATUSES in
// backend/src/services/admin/applicant-management-service.ts. The backend
// enforces this independently (409 on an invalid transition); this only
// avoids offering a button that would fail.
const ACCEPT_FROM = ["interviewed"];
const REJECT_FROM = ["interviewed", "test_failed"];

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    getAdminApplication(id)
      .then((res) => setApplication(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load application"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAccept() {
    setActing(true);
    try {
      const res = await acceptApplication(id);
      setApplication(res.data);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to accept application");
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    setActing(true);
    try {
      const res = await rejectApplication(id, reason || undefined);
      setApplication(res.data);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to reject application");
    } finally {
      setActing(false);
    }
  }

  if (loading) return <div className="text-gray-600">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>;
  if (!application) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => router.push("/admin/applications")} className="text-sm text-blue-600 hover:underline">
        ← Back to applicants
      </button>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">
              {application.firstName} {application.lastName}
            </h1>
            <p className="text-gray-600">{application.email}</p>
          </div>
          <span className="px-3 py-1 rounded bg-gray-100 text-sm font-semibold">{application.status}</span>
        </div>

        {application.bio && <p className="text-gray-800">{application.bio}</p>}

        <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
          <div>
            <p className="text-gray-600">Primary division preference</p>
            <p className="font-semibold">{application.divisionPreferencePrimary ?? "None given"}</p>
          </div>
          <div>
            <p className="text-gray-600">Secondary division preference</p>
            <p className="font-semibold">{application.divisionPreferenceSecondary ?? "None given"}</p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-3">
          {REJECT_FROM.includes(application.status) && (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional, kept for the audit trail only)"
              className="w-full border rounded px-3 py-2 text-sm"
              rows={2}
            />
          )}
          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={acting || !ACCEPT_FROM.includes(application.status)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded transition"
            >
              Accept
            </button>
            <button
              onClick={handleReject}
              disabled={acting || !REJECT_FROM.includes(application.status)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded transition"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
