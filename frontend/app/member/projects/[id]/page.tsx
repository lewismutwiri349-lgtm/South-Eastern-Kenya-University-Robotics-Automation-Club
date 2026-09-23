"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, apiUpload } from "@/lib/api";

interface ProjectFile {
  id: string;
  name: string;
  category: string;
  visibility: "team" | "public";
  currentVersion: number;
  updatedAt: number;
}

interface FileVersion {
  version: number;
  originalName: string;
  size: number;
  note: string | null;
  createdAt: number;
}

interface TeamMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  role: string | null;
}

interface Candidate {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, FileVersion[]>>({});
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    const res = await apiFetch<{ data: ProjectFile[] }>(`/api/projects/${id}/files`);
    setFiles(res.data);
  };

  const loadTeam = async () => {
    const res = await apiFetch<{ data: TeamMember[] }>(`/api/projects/${id}/team`);
    setTeam(res.data);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadFiles(), loadTeam()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        const form = new FormData();
        form.set("file", file);
        form.set("visibility", "team");
        await apiUpload(`/api/projects/${id}/files`, form);
      }
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleNewVersion = async (fileId: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", fileList[0]);
      await apiUpload(`/api/projects/${id}/files/${fileId}/versions`, form);
      await loadFiles();
      if (expandedFile === fileId) await loadVersions(fileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const loadVersions = async (fileId: string) => {
    const res = await apiFetch<{ data: FileVersion[] }>(`/api/projects/${id}/files/${fileId}/versions`);
    setVersions((prev) => ({ ...prev, [fileId]: res.data }));
  };

  const toggleVersions = async (fileId: string) => {
    if (expandedFile === fileId) {
      setExpandedFile(null);
      return;
    }
    setExpandedFile(fileId);
    if (!versions[fileId]) await loadVersions(fileId);
  };

  const searchCandidates = async (q: string) => {
    setCandidateQuery(q);
    if (q.trim().length < 2) {
      setCandidates([]);
      return;
    }
    try {
      const res = await apiFetch<{ data: Candidate[] }>(
        `/api/projects/${id}/team/candidates?q=${encodeURIComponent(q)}`
      );
      setCandidates(res.data);
    } catch {
      setCandidates([]);
    }
  };

  const addMember = async (userId: string) => {
    try {
      await apiFetch(`/api/projects/${id}/team`, {
        method: "POST",
        body: JSON.stringify({ userId, role: "contributor" }),
      });
      setCandidateQuery("");
      setCandidates([]);
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  };

  const removeMember = async (memberProjectId: string) => {
    try {
      await apiFetch(`/api/projects/${id}/team/${memberProjectId}`, { method: "DELETE" });
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">{error}</div>}

      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Files</h2>
          <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer">
            {uploading ? "Uploading..." : "+ Upload file"}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files)}
            />
          </label>
        </div>

        {files.length === 0 ? (
          <p className="text-sm text-gray-500">No files uploaded yet.</p>
        ) : (
          <ul className="divide-y">
            {files.map((file) => (
              <li key={file.id} className="py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {file.category} · v{file.currentVersion} · {file.visibility}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787"}/api/projects/${id}/files/${file.id}/download`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => toggleVersions(file.id)}
                      className="text-sm text-gray-600 hover:underline"
                    >
                      {expandedFile === file.id ? "Hide versions" : "Versions"}
                    </button>
                    <label className="text-sm text-gray-600 hover:underline cursor-pointer">
                      New version
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleNewVersion(file.id, e.target.files)}
                      />
                    </label>
                  </div>
                </div>

                {expandedFile === file.id && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3">
                    {(versions[file.id] ?? []).map((v) => (
                      <div key={v.version} className="text-xs text-gray-600 flex justify-between py-1">
                        <span>
                          v{v.version} — {v.originalName} ({formatSize(v.size)})
                          {v.note && <span className="italic"> — {v.note}</span>}
                        </span>
                        <span>{new Date(v.createdAt * 1000).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Team</h2>
        <div className="mb-4">
          <input
            value={candidateQuery}
            onChange={(e) => searchCandidates(e.target.value)}
            placeholder="Search members to add..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          {candidates.length > 0 && (
            <ul className="border rounded-lg mt-1 divide-y">
              {candidates.map((c) => (
                <li
                  key={c.userId}
                  className="px-3 py-2 text-sm flex justify-between items-center hover:bg-gray-50 cursor-pointer"
                  onClick={() => addMember(c.userId)}
                >
                  <span>
                    {c.firstName} {c.lastName} <span className="text-gray-400">({c.email})</span>
                  </span>
                  <span className="text-blue-600">Add</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {team.length === 0 ? (
          <p className="text-sm text-gray-500">No team members assigned yet.</p>
        ) : (
          <ul className="divide-y">
            {team.map((m) => (
              <li key={m.id} className="py-2 flex justify-between items-center text-sm">
                <span>
                  {m.firstName} {m.lastName} <span className="text-gray-400">— {m.role ?? "contributor"}</span>
                </span>
                <button onClick={() => removeMember(m.id)} className="text-red-600 hover:underline text-xs">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
