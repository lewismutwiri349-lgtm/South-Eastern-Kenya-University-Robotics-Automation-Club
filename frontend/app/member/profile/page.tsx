"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

interface MemberProfile {
  id: string;
  bio: string;
  division: string;
}

interface Skill {
  id: string;
  skill: string;
  proficiency: string;
  yearsOfExperience: number | null;
}

export default function ProfileEditPage() {
  const _router = useRouter();
  const [_profile, setProfile] = useState<MemberProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [bio, setBio] = useState("");
  const [division, setDivision] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [newProficiency, setNewProficiency] = useState("intermediate");
  const [newYears, setNewYears] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await fetch(`${API_BASE_URL}/api/members/me`, {
          credentials: "include",
        });

        if (!profileRes.ok) {
          throw new Error("Failed to fetch profile");
        }

        const profileData = await profileRes.json();
        setProfile(profileData.data);
        setBio(profileData.data.bio || "");
        setDivision(profileData.data.division || "");

        // Fetch skills
        const skillsRes = await fetch(`${API_BASE_URL}/api/members/me/skills`, {
          credentials: "include",
        });

        if (skillsRes.ok) {
          const skillsData = await skillsRes.json();
          setSkills(skillsData.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/members/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bio, division }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to update profile");
      }

      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/members/me/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          skill: newSkill,
          proficiency: newProficiency,
          yearsOfExperience: newYears ? parseFloat(newYears) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to add skill");
      }

      const data = await res.json();
      setSkills([...skills, data.data]);
      setNewSkill("");
      setNewProficiency("intermediate");
      setNewYears("");
      setSuccess("Skill added successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!confirm("Remove this skill?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/members/me/skills/${skillId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to remove skill");
      }

      setSkills(skills.filter((s) => s.id !== skillId));
      setSuccess("Skill removed successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Edit Profile</h1>
        <p className="text-gray-600">Update your information and manage your skills</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          <p className="font-semibold">Success</p>
          <p>{success}</p>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tell us about yourself..."
          />
          <p className="text-xs text-gray-500 mt-1">{bio.length}/500</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Division</option>
            <option value="Hardware">Hardware</option>
            <option value="Firmware">Firmware</option>
            <option value="Software">Software</option>
            <option value="Business">Business</option>
            <option value="Marketing">Marketing</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded transition"
        >
          {submitting ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {/* Skills Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Your Skills</h2>

        {/* Existing Skills */}
        <div className="mb-6 space-y-2">
          {skills.length === 0 ? (
            <p className="text-gray-500 text-sm">No skills added yet</p>
          ) : (
            skills.map((skill) => (
              <div key={skill.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{skill.skill}</p>
                  <p className="text-sm text-gray-600">
                    {skill.proficiency}
                    {skill.yearsOfExperience && ` • ${skill.yearsOfExperience} years`}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveSkill(skill.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Skill Form */}
        <form onSubmit={handleAddSkill} className="border-t pt-4 space-y-3">
          <h3 className="font-medium text-gray-900">Add a Skill</h3>

          <div>
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="e.g., SolidWorks, Python, PCB Design"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              value={newProficiency}
              onChange={(e) => setNewProficiency(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>

            <input
              type="number"
              step="0.5"
              value={newYears}
              onChange={(e) => setNewYears(e.target.value)}
              placeholder="Years of experience (optional)"
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !newSkill.trim()}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded transition"
          >
            {submitting ? "Adding..." : "Add Skill"}
          </button>
        </form>
      </div>
    </div>
  );
}
