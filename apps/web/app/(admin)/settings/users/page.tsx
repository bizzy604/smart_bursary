"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatShortDate } from "@/lib/format";
import {
  type AdminUser,
  type AdminUserRole,
  deactivateAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  reactivateAdminUser,
} from "@/lib/admin-users";

const ROLE_LABELS: Record<AdminUserRole, string> = {
  STUDENT: "Student",
  WARD_ADMIN: "Ward Admin",
  VILLAGE_ADMIN: "Village Admin",
  FIELD_AGENT: "Field Agent",
  FINANCE_OFFICER: "Finance Officer",
  COUNTY_ADMIN: "County Admin",
  PLATFORM_OPERATOR: "Platform Operator",
};

const ROLE_FILTERS: AdminUserRole[] = [
  "COUNTY_ADMIN",
  "WARD_ADMIN",
  "VILLAGE_ADMIN",
  "FINANCE_OFFICER",
  "FIELD_AGENT",
];

type ConfirmAction = "deactivate" | "reactivate" | "delete";

interface PendingConfirm {
  action: ConfirmAction;
  user: AdminUser;
}

export default function SettingsUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | AdminUserRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const list = await fetchAdminUsers();
      setUsers(list);
      setError(null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Failed to load tenant users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && !user.isActive) return false;
      if (statusFilter === "INACTIVE" && user.isActive) return false;
      if (term && !user.email.toLowerCase().includes(term) && !(user.phone ?? "").toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleConfirm = async () => {
    if (!confirm) return;
    const { action, user } = confirm;
    setBusyId(user.id);
    try {
      if (action === "deactivate") {
        await deactivateAdminUser(user.id);
        toast.success("User deactivated", {
          description: `${user.email} can no longer sign in until reactivated.`,
        });
      } else if (action === "reactivate") {
        await reactivateAdminUser(user.id);
        toast.success("User reactivated", { description: `${user.email} can sign in again.` });
      } else {
        await deleteAdminUser(user.id);
        toast.success("User deleted", {
          description: `${user.email} has been removed from this tenant.`,
        });
      }
      setConfirm(null);
      await loadUsers();
    } catch (reason: unknown) {
      toast.error("Action failed", {
        description: reason instanceof Error ? reason.message : "Unable to complete the action.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const total = users.length;
  const activeCount = users.filter((user) => user.isActive).length;
  const inactiveCount = total - activeCount;

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Tenant Users</CardTitle>
            <CardDescription>
              Manage county admins, ward / village reviewers, finance officers, and field agents for this tenant.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/settings/users/new">Invite User</Link>
          </Button>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle>{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active</CardDescription>
            <CardTitle>{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Inactive</CardDescription>
            <CardTitle>{inactiveCount}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            {filteredUsers.length} of {total} users shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Search email or phone…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                {ROLE_FILTERS.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Active" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active only</SelectItem>
                <SelectItem value="INACTIVE">Inactive only</SelectItem>
                <SelectItem value="ALL">Active + inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Loading users…
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No users match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{user.email}</div>
                        {user.phone ? (
                          <div className="text-xs text-muted-foreground">{user.phone}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>{ROLE_LABELS[user.role]}</TableCell>
                      <TableCell>{user.ward ? user.ward.name : <span className="text-muted-foreground/70">—</span>}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.lastLoginAt ? formatShortDate(user.lastLoginAt) : <span className="text-muted-foreground/70">Never</span>}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={busyId === user.id}>
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Manage user</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {user.isActive ? (
                              <DropdownMenuItem onClick={() => setConfirm({ action: "deactivate", user })}>
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setConfirm({ action: "reactivate", user })}>
                                Reactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-700 focus:text-red-700"
                              onClick={() => setConfirm({ action: "delete", user })}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !busyId && !open && setConfirm(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "delete"
                ? "Delete user?"
                : confirm?.action === "deactivate"
                  ? "Deactivate user?"
                  : "Reactivate user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "delete"
                ? `${confirm.user.email} will be soft-deleted and removed from the directory. This cannot be undone from the UI.`
                : confirm?.action === "deactivate"
                  ? `${confirm?.user.email} will lose access immediately and will not be able to sign in.`
                  : `${confirm?.user.email} will regain sign-in access.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant={confirm?.action === "delete" ? "destructive" : "default"}
                disabled={busyId !== null}
                onClick={(event) => {
                  event.preventDefault();
                  void handleConfirm();
                }}
              >
                {busyId
                  ? "Working…"
                  : confirm?.action === "delete"
                    ? "Delete user"
                    : confirm?.action === "deactivate"
                      ? "Deactivate"
                      : "Reactivate"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
