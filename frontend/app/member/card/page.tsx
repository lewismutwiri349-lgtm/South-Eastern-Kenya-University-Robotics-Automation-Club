"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

interface MemberCard {
  profile: {
    id: string;
    bio: string;
    division: string;
    joinedAt: number;
    yearsInClub: number;
  };
  skills: any[];
  certifications: any[];
  achievements: any[];
}

export default function MemberCardPage() {
  const [card, setCard] = useState<MemberCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/members/me/card`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch membership card");
        }

        const data = await res.json();
        setCard(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading your card...</p>
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

  if (!card) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        <p className="font-semibold">Card Not Found</p>
      </div>
    );
  }

  const joinedDate = new Date(card.profile.joinedAt * 1000).toLocaleDateString();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Your Membership Card</h1>
        <p className="text-gray-600">Digital membership card — share or print</p>
      </div>

      {/* Digital Card */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-8 aspect-video flex flex-col justify-between">
          {/* Card Header */}
          <div>
            <div className="text-sm font-semibold opacity-80">MEMBER</div>
            <div className="text-3xl font-bold mt-2">{card.profile.bio}</div>
          </div>

          {/* Card Body */}
          <div className="space-y-2 text-sm">
            <div>
              <span className="opacity-80">Division:</span> {card.profile.division || "Not assigned"}
            </div>
            <div>
              <span className="opacity-80">Member Since:</span> {joinedDate}
            </div>
            <div>
              <span className="opacity-80">Years in Club:</span> {card.profile.yearsInClub}
            </div>
          </div>

          {/* Card Footer */}
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs opacity-60">SEKU Robotics Club</div>
            </div>
            <div className="text-xs opacity-60">ID: {card.profile.id.slice(0, 8)}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-6 justify-center">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded transition"
          >
            🖨️ Print Card
          </button>
          <button
            onClick={() => navigator.share?.({ title: "My SEKU Membership Card", text: "Check out my membership!" })}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition"
          >
            📤 Share Card
          </button>
        </div>
      </div>

      {/* Card Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skills */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Skills ({card.skills.length})</h2>
          {card.skills.length === 0 ? (
            <p className="text-gray-500 text-sm">No skills listed yet</p>
          ) : (
            <div className="space-y-2">
              {card.skills.map((skill) => (
                <div key={skill.id} className="text-sm">
                  <p className="font-medium text-gray-900">{skill.skill}</p>
                  <p className="text-gray-600 text-xs">
                    {skill.proficiency}
                    {skill.yearsOfExperience && ` • ${skill.yearsOfExperience}y`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Achievements ({card.achievements.length})</h2>
          {card.achievements.length === 0 ? (
            <p className="text-gray-500 text-sm">No achievements yet</p>
          ) : (
            <div className="space-y-2">
              {card.achievements.slice(0, 5).map((achievement) => (
                <div key={achievement.id} className="text-sm">
                  <p className="font-medium text-gray-900">{achievement.title}</p>
                  <p className="text-gray-600 text-xs">{achievement.badgeType}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
