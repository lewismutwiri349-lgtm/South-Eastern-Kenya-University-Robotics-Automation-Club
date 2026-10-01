"use client";

import { useEffect, useState } from "react";
import { getMe } from "@/lib/api";
import { listAdminUsers, changeUserRole, type AdminUser } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

const USER_ROLES = [
  "super_admin",
  "chairperson",
  "vice_chairperson",
  "secretary",
  "treasurer",
  "division_head",
  "project_leader",
  "moderator",
  "member",
  "applicant",
];

// Matches backend/src/routes/admin/roles.ts's ROLE_GRANT_ROLES — the
// backend enforces this independently; this only hides the control from
// staff who'd get a 403 anyway.
const ROLE_GRANT_ROLES = ["super_admin", "chairperson"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [canGrantRoles, setCanGrantRoles] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    getMe().then((me) => setCanGrantRoles(!!me && ROLE_GRANT_ROLES.includes(me.role)));
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminUsers({ q: query || undefined, role: roleFilter || undefined });
      setUsers(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRoleChange(userId: string, role: string) {
    setSavingUserId(userId);
    try {
      const res = await changeUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to change role");
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Users</h1>
        <p className="text-gray-600">
          {canGrantRoles
            ? "Search the roster and grant roles."
            : "Search the roster. Role changes are restricted to the Chairperson and Super Admin."}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex gap-3"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="flex-1 border rounded px-3 py-2"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border rounded px-3 py-2">
          <option value="">All roles</option>
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
          Search
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>}

      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Role</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Verified</th>
                {canGrantRoles && <th className="px-4 py-3 text-sm font-semibold text-gray-600">Change role</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded bg-gray-100 text-sm">{u.role}</span>
                  </td>
                  <td className="px-4 py-3">{u.emailVerified ? "Yes" : "No"}</td>
                  {canGrantRoles && (
                    <td className="px-4 py-3">
                      <select
                        defaultValue={u.role}
                        disabled={savingUserId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="border rounded px-2 py-1"
                      >
                        {USER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={canGrantRoles ? 5 : 4} className="px-4 py-6 text-center text-gray-500">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
