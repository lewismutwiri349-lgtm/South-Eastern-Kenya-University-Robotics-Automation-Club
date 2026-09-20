"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

interface Application {
  id: string;
  status: string;
  firstName: string;
  lastName: string;
  submittedAt: string | null;
}

/**
 * Applicant portal dashboard.
 * Shows application status and available next actions.
 */
export default function ApplicantPortalPage() {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        // Try to get current user's application
        const res = await fetch(`${API_BASE_URL}/api/identity/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Not authenticated");
        }

        // Now fetch application by user
        // For now, we'll just show that no application exists yet
        // In a production app, this would query by user_id
        setApplication(null);
      } catch {
        // User not authenticated or error
        setApplication(null);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, []);

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      draft: { label: "Draft", color: "bg-gray-100 text-gray-800" },
      submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800" },
      testing: { label: "Testing", color: "bg-yellow-100 text-yellow-800" },
      test_passed: { label: "Test Passed", color: "bg-green-100 text-green-800" },
      test_failed: { label: "Test Failed", color: "bg-red-100 text-red-800" },
      interview_scheduled: { label: "Interview Scheduled", color: "bg-purple-100 text-purple-800" },
      interviewed: { label: "Interviewed", color: "bg-indigo-100 text-indigo-800" },
      accepted: { label: "Accepted", color: "bg-green-100 text-green-800" },
      rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
    };

    return statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800" };
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case "draft":
        return <Link href="/applicant/apply" className="btn btn-primary">Submit Application</Link>;
      case "submitted":
        return <Link href="/applicant/test" className="btn btn-primary">Start Aptitude Test</Link>;
      case "testing":
        return <Link href="/applicant/test" className="btn btn-primary">Continue Test</Link>;
      case "test_passed":
        return <Link href="/applicant/schedule-interview" className="btn btn-primary">Schedule Interview</Link>;
      case "interview_scheduled":
        return <Link href="/applicant/status" className="btn btn-secondary">View Interview Details</Link>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading your application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Applicant Portal</h1>
        <p className="text-gray-600">Welcome to your application journey</p>
      </div>

      {application ? (
        <>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Your Application</h2>
                <p className="text-gray-600">
                  {application.firstName} {application.lastName}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusDisplay(application.status).color}`}>
                {getStatusDisplay(application.status).label}
              </div>
            </div>

            {application.submittedAt && (
              <p className="text-sm text-gray-600 mb-4">
                Submitted: {new Date(application.submittedAt).toLocaleDateString()}
              </p>
            )}

            <div className="mt-6 flex gap-4">
              {getNextAction(application.status)}
              <Link href="/applicant/status" className="btn btn-secondary">
                View Full Status
              </Link>
            </div>
          </div>

          {/* Application Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-6">Application Timeline</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${application.status !== "draft" ? "bg-green-500" : "bg-gray-300"}`}></div>
                <div>
                  <p className="font-semibold">Application</p>
                  <p className="text-sm text-gray-600">Submit your background information</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${["testing", "test_passed", "test_failed", "interview_scheduled", "interviewed", "accepted", "rejected"].includes(application.status) ? "bg-green-500" : "bg-gray-300"}`}></div>
                <div>
                  <p className="font-semibold">Aptitude Test</p>
                  <p className="text-sm text-gray-600">Complete a timed engineering assessment</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${["interview_scheduled", "interviewed", "accepted", "rejected"].includes(application.status) ? "bg-green-500" : "bg-gray-300"}`}></div>
                <div>
                  <p className="font-semibold">Interview</p>
                  <p className="text-sm text-gray-600">Meet with club leadership</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to Apply?</h2>
          <p className="text-gray-600 mb-6">
            Start your application to join the Robotics & Autonomous Systems Club.
          </p>
          <Link href="/applicant/apply" className="btn btn-primary inline-block">
            Begin Application
          </Link>
        </div>
      )}
    </div>
  );
}
