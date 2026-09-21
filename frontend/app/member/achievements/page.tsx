"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

interface Achievement {
  id: string;
  badgeType: string;
  title: string;
  description: string;
  iconUrl: string;
  earnedAt: number;
  reason: string;
}

const BADGE_COLORS: Record<string, string> = {
  project_lead: "bg-blue-100 text-blue-800 border-blue-300",
  mentor: "bg-purple-100 text-purple-800 border-purple-300",
  innovator: "bg-green-100 text-green-800 border-green-300",
  team_player: "bg-orange-100 text-orange-800 border-orange-300",
  engineer_of_month: "bg-yellow-100 text-yellow-800 border-yellow-300",
  certified_expert: "bg-red-100 text-red-800 border-red-300",
  first_project: "bg-pink-100 text-pink-800 border-pink-300",
  power_user: "bg-indigo-100 text-indigo-800 border-indigo-300",
};

const BADGE_ICONS: Record<string, string> = {
  project_lead: "🎯",
  mentor: "👨‍🏫",
  innovator: "💡",
  team_player: "🤝",
  engineer_of_month: "🏆",
  certified_expert: "⭐",
  first_project: "🚀",
  power_user: "⚡",
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/members/me/achievements?limit=50`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch achievements");
        }

        const data = await res.json();
        setAchievements(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading achievements...</p>
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Your Achievements</h1>
        <p className="text-gray-600">
          Recognition for your contributions and milestones
          {achievements.length > 0 && ` • ${achievements.length} total`}
        </p>
      </div>

      {achievements.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🌱</div>
          <p className="text-blue-900 font-semibold mb-2">No achievements yet</p>
          <p className="text-blue-700 text-sm">
            Keep contributing to the club to earn badges and recognition!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement) => {
            const badgeColor = BADGE_COLORS[achievement.badgeType] || "bg-gray-100 text-gray-800 border-gray-300";
            const badgeIcon = BADGE_ICONS[achievement.badgeType] || "🏅";
            const earnedDate = new Date(achievement.earnedAt * 1000).toLocaleDateString();

            return (
              <div
                key={achievement.id}
                className={`border rounded-lg p-6 flex flex-col items-center text-center ${badgeColor}`}
              >
                <div className="text-5xl mb-3">{badgeIcon}</div>
                <h3 className="font-semibold text-lg mb-1">{achievement.title}</h3>
                {achievement.description && (
                  <p className="text-sm opacity-80 mb-3">{achievement.description}</p>
                )}
                <p className="text-xs opacity-70">Earned {earnedDate}</p>
                {achievement.reason && (
                  <p className="text-xs opacity-60 mt-2 italic">"{achievement.reason}"</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Achievement Guide */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Achievement Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-medium mb-1">🎯 Project Lead</p>
            <p className="text-xs">Lead a robotics project from start to finish</p>
          </div>
          <div>
            <p className="font-medium mb-1">👨‍🏫 Mentor</p>
            <p className="text-xs">Help newer members learn and grow</p>
          </div>
          <div>
            <p className="font-medium mb-1">💡 Innovator</p>
            <p className="text-xs">Bring creative ideas to the club</p>
          </div>
          <div>
            <p className="font-medium mb-1">🤝 Team Player</p>
            <p className="text-xs">Show outstanding teamwork and collaboration</p>
          </div>
          <div>
            <p className="font-medium mb-1">🏆 Engineer of the Month</p>
            <p className="text-xs">Stand out for exceptional engineering work</p>
          </div>
          <div>
            <p className="font-medium mb-1">⭐ Certified Expert</p>
            <p className="text-xs">Achieve professional certification</p>
          </div>
        </div>
      </div>
    </div>
  );
}
