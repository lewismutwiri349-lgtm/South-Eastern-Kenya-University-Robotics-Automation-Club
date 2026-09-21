"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";

interface MemberProfile {
  id: string;
  bio: string;
  division: string;
  joinedAt: number;
  yearsInClub: number;
}

export default function MemberDashboard() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/members/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();
        setProfile(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
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

  if (!profile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        <p className="font-semibold">Profile Not Found</p>
        <p>Your member profile hasn't been set up yet.</p>
      </div>
    );
  }

  const joinedDate = new Date(profile.joinedAt * 1000).toLocaleDateString();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Welcome to Your Member Portal</h1>
        <p className="text-gray-600">Manage your profile, track achievements, and view your membership details</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{profile.bio}</h2>
            <p className="text-gray-600 mt-1">
              Division: <span className="font-semibold">{profile.division || "Not assigned"}</span>
            </p>
          </div>
          <Link
            href="/member/profile"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition"
          >
            Edit Profile
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-gray-600 text-sm">Member Since</p>
            <p className="text-lg font-semibold text-gray-900">{joinedDate}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Years in Club</p>
            <p className="text-lg font-semibold text-gray-900">{profile.yearsInClub}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Status</p>
            <p className="text-lg font-semibold text-green-600">Active</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/member/card"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-blue-600"
        >
          <h3 className="text-lg font-semibold mb-2">📇 Membership Card</h3>
          <p className="text-gray-600 text-sm">View and share your digital membership card</p>
        </Link>

        <Link
          href="/member/profile"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-green-600"
        >
          <h3 className="text-lg font-semibold mb-2">👤 Edit Profile</h3>
          <p className="text-gray-600 text-sm">Update your bio, skills, and certifications</p>
        </Link>

        <Link
          href="/member/achievements"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-purple-600"
        >
          <h3 className="text-lg font-semibold mb-2">🏆 Achievements</h3>
          <p className="text-gray-600 text-sm">View badges and recognitions earned</p>
        </Link>
      </div>
    </div>
  );
}
