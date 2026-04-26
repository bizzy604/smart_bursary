import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminUsersMock } = vi.hoisted(() => ({
  fetchAdminUsersMock: vi.fn(),
}));

vi.mock("@/lib/admin-users", () => ({
  fetchAdminUsers: fetchAdminUsersMock,
  fetchTenantWards: vi.fn(),
  deactivateAdminUser: vi.fn(),
  reactivateAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
  inviteAdminUser: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import SettingsUsersPage from "@/app/(admin)/settings/users/page";

describe("SettingsUsersPage", () => {
  beforeEach(() => {
    fetchAdminUsersMock.mockReset();
    fetchAdminUsersMock.mockResolvedValue([
      {
        id: "user-1",
        email: "ward.admin@turkana.go.ke",
        phone: null,
        role: "WARD_ADMIN",
        isActive: true,
        emailVerified: true,
        phoneVerified: false,
        wardId: "ward-1",
        ward: { id: "ward-1", name: "Lodwar Ward", code: "LDW" },
        lastLoginAt: "2026-04-20T10:00:00.000Z",
        createdAt: "2026-04-01T10:00:00.000Z",
        updatedAt: "2026-04-20T10:00:00.000Z",
      },
      {
        id: "user-2",
        email: "finance@turkana.go.ke",
        phone: "+254712345678",
        role: "FINANCE_OFFICER",
        isActive: true,
        emailVerified: true,
        phoneVerified: false,
        wardId: null,
        ward: null,
        lastLoginAt: null,
        createdAt: "2026-04-02T10:00:00.000Z",
        updatedAt: "2026-04-02T10:00:00.000Z",
      },
    ]);
  });

  it("loads tenant users from the API and renders rows", async () => {
    render(<SettingsUsersPage />);

    await waitFor(() => {
      expect(fetchAdminUsersMock).toHaveBeenCalled();
    });

    expect(await screen.findByText("Tenant Users")).toBeInTheDocument();
    expect(await screen.findByText("ward.admin@turkana.go.ke")).toBeInTheDocument();
    expect(screen.getByText("finance@turkana.go.ke")).toBeInTheDocument();
    expect(screen.getByText("Lodwar Ward")).toBeInTheDocument();
  });
});
