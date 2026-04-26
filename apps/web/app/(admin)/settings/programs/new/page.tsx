"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { createAdminProgram } from "@/lib/admin-programs";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWards } from "@/hooks/use-locations";

type ProgramFormState = {
  name: string;
  description: string;
  academicYear: string;
  wardId: string;
  budgetCeiling: string;
  opensAt?: Date;
  closesAt?: Date;
};

const initialState: ProgramFormState = {
  name: "",
  description: "",
  academicYear: "",
  wardId: "",
  budgetCeiling: "",
  opensAt: undefined,
  closesAt: undefined,
};

function toDateIso(value: Date): string {
  return value.toISOString();
}

export default function NewProgramSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProgramFormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { wards, isLoading: wardsLoading } = useWards();

  const isValid = useMemo(() => {
    if (!form.name.trim() || !form.budgetCeiling.trim() || !form.opensAt?.getTime() || !form.closesAt?.getTime()) {
      return false;
    }
    const budget = Number(form.budgetCeiling);
    if (!Number.isFinite(budget) || budget <= 0) {
      return false;
    }

    const opensAt = form.opensAt?.getTime();
    const closesAt = form.closesAt?.getTime();
    return Number.isFinite(opensAt) && Number.isFinite(closesAt) && closesAt > opensAt;
  }, [form]);

  async function submit() {
    if (!isValid) {
      const message = "Provide all required fields and ensure closing date is after opening date.";
      setFeedback({ type: "error", message });
      toast.error("Create blocked", { description: message });
      return;
    }

    const opensAt = form.opensAt;
    const closesAt = form.closesAt;

    if (!opensAt || !closesAt) {
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
        opensAt: toDateIso(opensAt),
        closesAt: toDateIso(closesAt),
      });

      setFeedback({ type: "success", message: "Program created. Redirecting to details..." });
      toast.success("Program created", {
        description: "Opening the new program details page.",
      });
      router.push(`/county/programs/${created.id}` as Route);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create program.";
      setFeedback({
        type: "error",
        message,
      });
      toast.error("Create failed", { description: message });
    } finally {
      setIsCreateDialogOpen(false);
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
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-foreground/90">Program Name</span>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="2026 County Bursary Intake"
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-foreground/90">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Eligibility and policy notes for this intake"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground/90">Academic Year</span>
              <Input
                value={form.academicYear}
                onChange={(event) => setForm((current) => ({ ...current, academicYear: event.target.value }))}
                placeholder="2026"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground/90">Ward (Optional)</span>
              <Select value={form.wardId} onValueChange={(value) => setForm((current) => ({ ...current, wardId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Leave blank for county-wide" />
                </SelectTrigger>
                <SelectContent>
                  {wardsLoading ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Loading wards...</div>
                  ) : wards.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No wards available</div>
                  ) : (
                    wards.map((ward) => (
                      <SelectItem key={ward.id} value={ward.id}>
                        {ward.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground/90">Budget Ceiling (KES)</span>
              <Input
                type="number"
                min={1}
                step={0.01}
                value={form.budgetCeiling}
                onChange={(event) => setForm((current) => ({ ...current, budgetCeiling: event.target.value }))}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground/90">Opens At</span>
              <DatePicker
                value={form.opensAt}
                onChange={(date) => setForm((current) => ({ ...current, opensAt: date }))}
                placeholder="Pick opening date"
                triggerClassName="w-full"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground/90">Closes At</span>
              <DatePicker
                value={form.closesAt}
                onChange={(date) => setForm((current) => ({ ...current, closesAt: date }))}
                placeholder="Pick closing date"
                triggerClassName="w-full"
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Link href={"/county/programs" as Route}>
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={() => setIsCreateDialogOpen(true)} disabled={isSaving || !isValid}>
              {isSaving ? "Creating..." : "Create Program"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Create this program?</AlertDialogTitle>
            <AlertDialogDescription>
              The new bursary program will be saved as a draft. Students will not see it until you publish it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submit()} disabled={isSaving}>
              {isSaving ? "Creating..." : "Confirm Create"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
