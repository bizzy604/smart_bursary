/**
 * Frontend client wrappers for the tenant user-directory CRUD endpoints.
 * Used by the admin /settings/users surface.
 */
import { apiRequestJson } from "@/lib/api-client";

export type AdminUserRole =
  | "COUNTY_ADMIN"
  | "WARD_ADMIN"
  | "VILLAGE_ADMIN"
  | "FINANCE_OFFICER"
  | "PLATFORM_OPERATOR"
  | "STUDENT";

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  role: AdminUserRole;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  wardId: string | null;
  ward: { id: string; name: string; code: string | null } | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InviteUserResult {
  user: AdminUser;
  temporaryPassword: string;
  verifyToken: string;
  verifyTokenExpiresAt: string;
}

export interface UserFilters {
  role?: AdminUserRole;
  wardId?: string;
  isActive?: boolean;
  q?: string;
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value.length > 0) {
      search.set(key, value);
    }
  }
  const text = search.toString();
  return text.length > 0 ? `?${text}` : "";
}

export interface TenantWard {
  id: string;
  name: string;
  code: string | null;
}

export async function fetchTenantWards(): Promise<TenantWard[]> {
  const payload = await apiRequestJson<unknown>(`/users/_meta/wards`, { method: "GET" });
  return unwrap<TenantWard[]>(payload);
}

export async function fetchAdminUsers(filters?: UserFilters): Promise<AdminUser[]> {
  const payload = await apiRequestJson<unknown>(
    `/users${buildQuery({
      role: filters?.role,
      wardId: filters?.wardId,
      isActive: filters?.isActive === undefined ? undefined : String(filters.isActive),
      q: filters?.q,
    })}`,
    { method: "GET" },
  );
  return unwrap<AdminUser[]>(payload);
}

export async function inviteAdminUser(input: {
  email: string;
  role: AdminUserRole;
  wardId?: string;
  phone?: string;
}): Promise<InviteUserResult> {
  const payload = await apiRequestJson<unknown>(`/users/invite`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (payload && typeof payload === "object" && "data" in (payload as object)) {
    const envelope = payload as {
      data: AdminUser;
      invite: {
        temporaryPassword: string;
        verifyToken: string;
        verifyTokenExpiresAt: string;
      };
    };
    return {
      user: envelope.data,
      temporaryPassword: envelope.invite.temporaryPassword,
      verifyToken: envelope.invite.verifyToken,
      verifyTokenExpiresAt: envelope.invite.verifyTokenExpiresAt,
    };
  }
  throw new Error("Invalid invite response");
}

export async function updateAdminUser(
  userId: string,
  input: { role?: AdminUserRole; wardId?: string | null; phone?: string | null },
): Promise<AdminUser> {
  const payload = await apiRequestJson<unknown>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return unwrap<AdminUser>(payload);
}

export async function deactivateAdminUser(userId: string): Promise<AdminUser> {
  const payload = await apiRequestJson<unknown>(`/users/${userId}/deactivate`, { method: "POST" });
  return unwrap<AdminUser>(payload);
}

export async function reactivateAdminUser(userId: string): Promise<AdminUser> {
  const payload = await apiRequestJson<unknown>(`/users/${userId}/reactivate`, { method: "POST" });
  return unwrap<AdminUser>(payload);
}

export async function deleteAdminUser(userId: string): Promise<AdminUser> {
  const payload = await apiRequestJson<unknown>(`/users/${userId}`, { method: "DELETE" });
  return unwrap<AdminUser>(payload);
}
