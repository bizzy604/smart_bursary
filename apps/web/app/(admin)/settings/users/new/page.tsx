"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AdminUserRole,
  fetchTenantWards,
  inviteAdminUser,
  type InviteUserResult,
  type TenantWard,
} from "@/lib/admin-users";

const INVITABLE_ROLES: { value: AdminUserRole; label: string; wardScoped: boolean }[] = [
  { value: "COUNTY_ADMIN", label: "County Admin", wardScoped: false },
  { value: "FINANCE_OFFICER", label: "Finance Officer", wardScoped: false },
  { value: "WARD_ADMIN", label: "Ward Admin", wardScoped: true },
  { value: "VILLAGE_ADMIN", label: "Village Admin", wardScoped: true },
];

export default function NewUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AdminUserRole>("WARD_ADMIN");
  const [wardId, setWardId] = useState<string>("");
  const [wards, setWards] = useState<TenantWard[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<InviteUserResult | null>(null);

  const roleConfig = INVITABLE_ROLES.find((entry) => entry.value === role);
  const requiresWard = roleConfig?.wardScoped ?? false;

  useEffect(() => {
    void fetchTenantWards()
      .then((list) => setWards(list))
      .catch((reason: unknown) => {
        toast.error("Failed to load wards", {
          description: reason instanceof Error ? reason.message : "Unable to fetch tenant wards.",
        });
      });
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Email required");
      return;
    }
    if (requiresWard && !wardId) {
      toast.error("Ward required", { description: "Pick a ward for this ward-scoped role." });
      return;
    }

    setSubmitting(true);
    try {
      const invite = await inviteAdminUser({
        email: email.trim().toLowerCase(),
        role,
        phone: phone.trim() || undefined,
        wardId: requiresWard ? wardId : undefined,
      });
      setResult(invite);
      toast.success("User invited", {
        description: `${invite.user.email} added with role ${invite.user.role}.`,
      });
    } catch (reason: unknown) {
      toast.error("Invite failed", {
        description: reason instanceof Error ? reason.message : "Unable to invite user.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <main className="page-shell mx-auto max-w-xl space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>User invited</CardTitle>
            <CardDescription>
              Share the temporary password and verification token with {result.user.email} so they
              can complete sign-in. Both expire on {new Date(result.verifyTokenExpiresAt).toLocaleString()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted p-3 font-mono text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Temporary password</div>
              <div className="break-all">{result.temporaryPassword}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted p-3 font-mono text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Email verify token</div>
              <div className="break-all">{result.verifyToken}</div>
            </div>
            <p className="text-xs text-muted-foreground">
              These secrets will not be shown again. The user must verify their email and change the
              password on first login.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => router.push("/settings/users")}>Back to directory</Button>
              <Button variant="outline" onClick={() => setResult(null)}>
                Invite another
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="page-shell mx-auto max-w-xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Invite User</CardTitle>
          <CardDescription>
            Create a new staff account. The user will receive a temporary password + email verification token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="reviewer@turkana.go.ke"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as AdminUserRole)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresWard ? (
              <div className="space-y-1.5">
                <Label htmlFor="ward">Ward</Label>
                <Select value={wardId} onValueChange={setWardId}>
                  <SelectTrigger id="ward">
                    <SelectValue placeholder={wards.length === 0 ? "Loading wards…" : "Select a ward"} />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((ward) => (
                      <SelectItem key={ward.id} value={ward.id}>
                        {ward.name}
                        {ward.code ? ` (${ward.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+254712345678"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Inviting…" : "Send invitation"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/settings/users">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
