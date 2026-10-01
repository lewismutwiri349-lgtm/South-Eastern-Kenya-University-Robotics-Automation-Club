import { apiFetch } from "./api";

/** Mirrors `AdminUserListItem` from `backend/src/services/admin/user-management-service.ts`. */
export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
};

/** Mirrors the `applications` row shape returned by the admin routes. */
export type AdminApplication = {
  id: string;
  userId: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  divisionPreferencePrimary: string | null;
  divisionPreferenceSecondary: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Page<T> = { data: T[]; meta: { nextCursor: string | null } };

export async function listAdminUsers(params: { role?: string; q?: string; cursor?: string } = {}): Promise<
  Page<AdminUser>
> {
  const query = new URLSearchParams();
  if (params.role) query.set("role", params.role);
  if (params.q) query.set("q", params.q);
  if (params.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return apiFetch<Page<AdminUser>>(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

export async function changeUserRole(userId: string, role: string): Promise<{ data: AdminUser }> {
  return apiFetch(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function listAdminApplications(
  params: { status?: string; cursor?: string } = {}
): Promise<Page<AdminApplication>> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return apiFetch<Page<AdminApplication>>(`/api/admin/applications${qs ? `?${qs}` : ""}`);
}

export async function getAdminApplication(id: string): Promise<{ data: AdminApplication }> {
  return apiFetch(`/api/admin/applications/${id}`);
}

export async function acceptApplication(id: string): Promise<{ data: AdminApplication }> {
  return apiFetch(`/api/admin/applications/${id}/accept`, { method: "POST" });
}

export async function rejectApplication(id: string, reason?: string): Promise<{ data: AdminApplication }> {
  return apiFetch(`/api/admin/applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });
}
