"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

export default function ApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    divisionPreferencePrimary: "",
    divisionPreferenceSecondary: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/applications/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to submit application");
      }

      router.push("/applicant");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Application Form</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800"><p>{error}</p></div>}
        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="firstName" placeholder="First Name" required value={formData.firstName} onChange={handleChange} className="px-3 py-2 border rounded" />
          <input type="text" name="lastName" placeholder="Last Name" required value={formData.lastName} onChange={handleChange} className="px-3 py-2 border rounded" />
        </div>
        <textarea name="bio" rows={4} placeholder="About yourself..." value={formData.bio} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
        <div className="grid grid-cols-2 gap-4">
          <select name="divisionPreferencePrimary" value={formData.divisionPreferencePrimary} onChange={handleChange} className="px-3 py-2 border rounded">
            <option value="">Primary Division</option>
            <option value="software">Software</option>
            <option value="avionics">Avionics</option>
          </select>
          <select name="divisionPreferenceSecondary" value={formData.divisionPreferenceSecondary} onChange={handleChange} className="px-3 py-2 border rounded">
            <option value="">Secondary Division</option>
            <option value="software">Software</option>
            <option value="avionics">Avionics</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
