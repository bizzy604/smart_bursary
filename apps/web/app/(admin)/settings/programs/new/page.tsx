"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createAdminProgram } from "@/lib/admin-programs";

type ProgramFormState = {
  name: string;
  description: string;
  academicYear: string;
  wardId: string;
  budgetCeiling: string;
  opensAt: string;
  closesAt: string;
};

const initialState: ProgramFormState = {
  name: "",
  description: "",
  academicYear: "",
  wardId: "",
  budgetCeiling: "",
  opensAt: "",
  closesAt: "",
};

function toIso(value: string): string {
  return new Date(value).toISOString();
}

export default function NewProgramSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProgramFormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const isValid = useMemo(() => {
    if (!form.name.trim() || !form.budgetCeiling.trim() || !form.opensAt || !form.closesAt) {
      return false;
    }
    const budget = Number(form.budgetCeiling);
    if (!Number.isFinite(budget) || budget <= 0) {
      return false;
    }

    const opensAt = new Date(form.opensAt).getTime();
    const closesAt = new Date(form.closesAt).getTime();
    return Number.isFinite(opensAt) && Number.isFinite(closesAt) && closesAt > opensAt;
  }, [form]);

  async function submit() {
    if (!isValid) {
      setFeedback({ type: "error", message: "Provide all required fields and ensure closing time is after opening." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const created = await createAdminProgram({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        academicYear: form.academicYear.trim() || undefined,
        wardId: form.wardId.trim() || undefined,
        budgetCeiling: Number(form.budgetCeiling),
        opensAt: toIso(form.opensAt),
        closesAt: toIso(form.closesAt),
      });

      setFeedback({ type: "success", message: "Program created. Redirecting to details..." });
      router.push(`/settings/programs/${created.id}`);
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create program.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Create Program</CardTitle>
          <CardDescription>Draft a new bursary intake and publish when policy review is complete.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback ? (
            <p
              className={`rounded-md px-3 py-2 text-sm ${
                feedback.type === "success"
                  ? "border border-success-200 bg-success-50 text-success-700"
                  : "border border-danger-200 bg-danger-50 text-danger-700"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-gray-700">Program Name</span>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="2026 County Bursary Intake"
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-gray-700">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                placeholder="Eligibility and policy notes for this intake"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-gray-700">Academic Year</span>
              <Input
                value={form.academicYear}
                onChange={(event) => setForm((current) => ({ ...current, academicYear: event.target.value }))}
                placeholder="2026"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-gray-700">Ward ID (Optional)</span>
              <Input
                value={form.wardId}
                onChange={(event) => setForm((current) => ({ ...current, wardId: event.target.value }))}
                placeholder="Leave blank for county-wide"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-gray-700">Budget Ceiling (KES)</span>
              <Input
                type="number"
                min={1}
                step={0.01}
                value={form.budgetCeiling}
                onChange={(event) => setForm((current) => ({ ...current, budgetCeiling: event.target.value }))}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-gray-700">Opens At</span>
              <Input
                type="datetime-local"
                value={form.opensAt}
                onChange={(event) => setForm((current) => ({ ...current, opensAt: event.target.value }))}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-gray-700">Closes At</span>
              <Input
                type="datetime-local"
                value={form.closesAt}
                onChange={(event) => setForm((current) => ({ ...current, closesAt: event.target.value }))}
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/settings/programs">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={() => void submit()} disabled={isSaving || !isValid}>
              {isSaving ? "Creating..." : "Create Program"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
