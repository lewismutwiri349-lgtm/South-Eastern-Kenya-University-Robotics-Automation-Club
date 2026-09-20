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

interface TestResult {
  testId: string;
  score: number;
  passed: boolean;
  submittedAt: string;
}

interface Interview {
  id: string;
  slotStartTime: string;
  slotDurationMinutes: number;
  scheduledAt: string;
}

/**
 * Application status page.
 * Shows timeline and allows scheduling interviews if test is passed.
 */
export default function StatusPage() {
  const [app, setApp] = useState<Application | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch application
        const appRes = await fetch(`${API_BASE_URL}/api/applications/me`, {
          credentials: "include",
        });

        if (!appRes.ok && appRes.status !== 404) {
          throw new Error("Failed to fetch application");
        }

        if (appRes.ok) {
          const appData = await appRes.json();
          setApp(appData.data);

          // If we have an app ID, fetch test result
          if (appData.data.id) {
            const testRes = await fetch(`${API_BASE_URL}/api/applications/${appData.data.id}/test-result`, {
              credentials: "include",
            });

            if (testRes.ok) {
              const testData = await testRes.json();
              setTestResult(testData.data);
            }

            // Fetch scheduled interviews
            const interviewRes = await fetch(`${API_BASE_URL}/api/applications/${appData.data.id}/interviews`, {
              credentials: "include",
            });

            if (interviewRes.ok) {
              const interviewData = await interviewRes.json();
              setInterviews(interviewData.data || []);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statusFlow = [
    { key: "draft", label: "Application Draft", icon: "📝" },
    { key: "submitted", label: "Application Submitted", icon: "✓" },
    { key: "testing", label: "Taking Test", icon: "✏️" },
    { key: "test_passed", label: "Test Passed", icon: "✓" },
    { key: "interview_scheduled", label: "Interview Scheduled", icon: "📅" },
    { key: "interviewed", label: "Interviewed", icon: "🎤" },
    { key: "accepted", label: "Accepted!", icon: "🎉" },
  ];

  const getStatusIndex = (status: string) => {
    const index = statusFlow.findIndex((s) => s.key === status);
    return index >= 0 ? index : 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading your status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-semibold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
        <p className="font-semibold">No Application</p>
        <p className="mb-4">You haven't started an application yet.</p>
        <Link href="/applicant/apply" className="text-blue-600 font-semibold hover:underline">
          Start Application →
        </Link>
      </div>
    );
  }

  const currentIndex = getStatusIndex(app.status);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Application Status</h1>
        <p className="text-gray-600">{app.firstName} {app.lastName}</p>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Your Journey</h2>
        <div className="space-y-4">
          {statusFlow.map((step, index) => (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index <= currentIndex
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step.icon}
                </div>
                {index < statusFlow.length - 1 && (
                  <div
                    className={`w-1 h-12 ${
                      index < currentIndex ? "bg-green-500" : "bg-gray-200"
                    }`}
                  ></div>
                )}
              </div>
              <div className="py-1">
                <p className={`font-semibold ${index <= currentIndex ? "text-gray-900" : "text-gray-500"}`}>
                  {step.label}
                </p>
                {index === currentIndex && (
                  <p className="text-sm text-blue-600 font-medium">Current step</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`rounded-lg shadow p-6 ${testResult.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <h3 className="text-lg font-semibold mb-4">
            {testResult.passed ? "✓ Test Passed!" : "✗ Test Not Passed"}
          </h3>
          <p className={`text-sm ${testResult.passed ? "text-green-700" : "text-red-700"}`}>
            <strong>Score:</strong> {testResult.score}%
          </p>
          <p className={`text-sm ${testResult.passed ? "text-green-700" : "text-red-700"}`}>
            <strong>Submitted:</strong> {new Date(testResult.submittedAt).toLocaleDateString()}
          </p>
          {testResult.passed && (
            <p className="text-sm text-green-700 mt-4">
              Congratulations! You can now schedule your interview.
            </p>
          )}
        </div>
      )}

      {/* Interview Scheduling */}
      {app.status === "test_passed" && !interviews.length && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2 text-blue-900">Ready for Your Interview?</h3>
          <p className="text-blue-800 mb-4">
            You've passed the aptitude test! Schedule your interview with the club leadership.
          </p>
          <Link href="/applicant/schedule-interview" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition">
            Schedule Interview →
          </Link>
        </div>
      )}

      {/* Scheduled Interviews */}
      {interviews.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Your Interview</h3>
          {interviews.map((interview) => (
            <div key={interview.id} className="bg-purple-50 border border-purple-200 rounded p-4">
              <p className="font-semibold text-purple-900">
                📅 {new Date(interview.slotStartTime).toLocaleDateString()} at{" "}
                {new Date(interview.slotStartTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-sm text-purple-700 mt-2">
                Duration: {interview.slotDurationMinutes} minutes
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Call to Action */}
      <div className="flex gap-4">
        <Link href="/applicant" className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded transition">
          Back to Portal
        </Link>
      </div>
    </div>
  );
}
