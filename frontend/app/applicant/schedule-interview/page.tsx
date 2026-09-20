"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

interface InterviewSlot {
  id: string;
  startTime: string;
  durationMinutes: number;
  maxCapacity: number;
  available: boolean;
}

/**
 * Interview slot selection and booking page.
 */
export default function ScheduleInterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get("appId");

  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/applications/interview-slots`, {
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.message || "Failed to fetch interview slots");
        }

        const data = await res.json();
        setSlots(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, []);

  const handleBookSlot = async () => {
    if (!selectedSlot || !appId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/applications/${appId}/schedule-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slotId: selectedSlot }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to schedule interview");
      }

      // Success
      router.push("/applicant/status?scheduled=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading available slots...</p>
        </div>
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Schedule Your Interview</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p className="font-semibold">No slots available</p>
          <p>Interview slots are not yet available. Please check back later.</p>
        </div>
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Schedule Your Interview</h1>
        <p className="text-gray-600">Select a time that works best for you</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {availableSlots.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            No available slots at this time. Please check back later.
          </p>
        ) : (
          <>
            {availableSlots.map((slot) => (
              <label
                key={slot.id}
                className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                style={{
                  borderColor: selectedSlot === slot.id ? "#2563eb" : "#e5e7eb",
                  backgroundColor: selectedSlot === slot.id ? "#eff6ff" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="slot"
                  checked={selectedSlot === slot.id}
                  onChange={() => setSelectedSlot(slot.id)}
                  className="mt-1 mr-4"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    📅 {new Date(slot.startTime).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-gray-600">
                    ⏰ {new Date(slot.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} ({slot.durationMinutes} minutes)
                  </p>
                </div>
              </label>
            ))}

            <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You can schedule only one interview. If you need to reschedule, contact club leadership.
              </p>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleBookSlot}
                disabled={!selectedSlot || submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded transition"
              >
                {submitting ? "Booking..." : "Confirm Interview"}
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded transition"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
