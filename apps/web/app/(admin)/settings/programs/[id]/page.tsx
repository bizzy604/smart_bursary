"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
import {
  closeAdminProgram,
  fetchAdminProgramById,
  ProgramDetail,
  publishAdminProgram,
  updateAdminProgram,
} from "@/lib/admin-programs";
import { formatCurrencyKes } from "@/lib/format";

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

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function resolveProgramId(params: ReturnType<typeof useParams>): string {
  const id = params.id;
  if (Array.isArray(id)) {
    return id[0] ?? "";
  }
  return typeof id === "string" ? id : "";
}

export default function ProgramSettingsDetailPage() {
  const params = useParams();
  const programId = resolveProgramId(params);
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [form, setForm] = useState<ProgramFormState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "publish" | "close" | null>(null);

  const isEditable = program?.status === "DRAFT";
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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const detail = await fetchAdminProgramById(programId);
        if (!mounted) {
          return;
        }
        setProgram(detail);
        setForm({
          name: detail.name,
          description: detail.description ?? "",
          academicYear: detail.academicYear ?? "",
          wardId: detail.wardId ?? "",
          budgetCeiling: String(detail.budgetCeiling),
          opensAt: toDateTimeLocal(detail.opensAt),
          closesAt: toDateTimeLocal(detail.closesAt),
      });
    } catch (error: unknown) {
        if (mounted) {
          setFeedback({ type: "error", message: error instanceof Error ? error.message : "Failed to load program." });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [programId]);

  async function reload() {
    const detail = await fetchAdminProgramById(programId);
    setProgram(detail);
    setForm({
      name: detail.name,
      description: detail.description ?? "",
      academicYear: detail.academicYear ?? "",
      wardId: detail.wardId ?? "",
      budgetCeiling: String(detail.budgetCeiling),
      opensAt: toDateTimeLocal(detail.opensAt),
      closesAt: toDateTimeLocal(detail.closesAt),
    });
  }

  async function saveDraftChanges() {
    if (!isValid || !isEditable) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const updated = await updateAdminProgram(programId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        academicYear: form.academicYear.trim() || undefined,
        wardId: form.wardId.trim() || undefined,
        budgetCeiling: Number(form.budgetCeiling),
        opensAt: toIso(form.opensAt),
        closesAt: toIso(form.closesAt),
      });
      setProgram(updated);
      setFeedback({ type: "success", message: "Draft program updated." });
      toast.success("Draft saved", {
        description: "Program changes were saved successfully.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update program.";
      setFeedback({ type: "error", message });
      toast.error("Save failed", { description: message });
    } finally {
      setPendingAction(null);
      setIsSaving(false);
    }
  }

  async function publishProgram() {
    if (program?.status !== "DRAFT") {
      return;
    }

    setIsMutating(true);
    setFeedback(null);
    try {
      await publishAdminProgram(programId);
      await reload();
      setFeedback({ type: "success", message: "Program published." });
      toast.success("Program published", {
        description: "Students can now see and apply to this program.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to publish program.";
      setFeedback({ type: "error", message });
      toast.error("Publish failed", { description: message });
    } finally {
      setPendingAction(null);
      setIsMutating(false);
    }
  }

  async function closeProgram() {
    if (program?.status !== "ACTIVE") {
      return;
    }

    setIsMutating(true);
    setFeedback(null);
    try {
      await closeAdminProgram(programId);
      await reload();
      setFeedback({ type: "success", message: "Program closed." });
      toast.success("Program closed", {
        description: "New submissions are now blocked.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to close program.";
      setFeedback({ type: "error", message });
      toast.error("Close failed", { description: message });
    } finally {
      setPendingAction(null);
      setIsMutating(false);
    }
  }

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Program Details</CardTitle>
              <CardDescription>Review lifecycle state and update draft configuration.</CardDescription>
            </div>
            <Link href={"/county/programs" as Route}>
              <Button variant="outline" size="sm">Back to Programs</Button>
            </Link>
          </div>
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

          {isLoading || !program ? (
            <p className="text-sm text-muted-foreground">Loading program details...</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-lg border border-secondary/30 bg-secondary/10 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-secondary">Status</p>
                  <p className="mt-1 font-serif text-xl font-semibold text-primary">{program.status}</p>
                </article>
                <article className="rounded-lg border border-secondary/30 bg-secondary/10 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-secondary">Allocated</p>
                  <p className="mt-1 font-serif text-xl font-semibold text-primary">{formatCurrencyKes(program.allocatedTotal)}</p>
                </article>
                <article className="rounded-lg border border-secondary/30 bg-secondary/10 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-secondary">Disbursed</p>
                  <p className="mt-1 font-serif text-xl font-semibold text-primary">{formatCurrencyKes(program.disbursedTotal)}</p>
                </article>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="font-medium text-foreground/90">Program Name</span>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    disabled={!isEditable}
                  />
                </label>

                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="font-medium text-foreground/90">Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    rows={3}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:bg-muted"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground/90">Academic Year</span>
                  <Input
                    value={form.academicYear}
                    onChange={(event) => setForm((current) => ({ ...current, academicYear: event.target.value }))}
                    disabled={!isEditable}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground/90">Ward ID (Optional)</span>
                  <Input
                    value={form.wardId}
                    onChange={(event) => setForm((current) => ({ ...current, wardId: event.target.value }))}
                    disabled={!isEditable}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground/90">Budget Ceiling (KES)</span>
                  <Input
                    type="number"
                    min={1}
                    step={0.01}
                    value={form.budgetCeiling}
                    onChange={(event) => setForm((current) => ({ ...current, budgetCeiling: event.target.value }))}
                    disabled={!isEditable}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground/90">Opens At</span>
                  <Input
                    type="datetime-local"
                    value={form.opensAt}
                    onChange={(event) => setForm((current) => ({ ...current, opensAt: event.target.value }))}
                    disabled={!isEditable}
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground/90">Closes At</span>
                  <Input
                    type="datetime-local"
                    value={form.closesAt}
                    onChange={(event) => setForm((current) => ({ ...current, closesAt: event.target.value }))}
                    disabled={!isEditable}
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {isEditable ? (
                  <Button onClick={() => setPendingAction("save")} disabled={isSaving || !isValid}>
                    {isSaving ? "Saving..." : "Save Draft"}
                  </Button>
                ) : null}
                {program.status === "DRAFT" ? (
                  <Button variant="secondary" onClick={() => setPendingAction("publish")} disabled={isMutating}>
                    {isMutating ? "Publishing..." : "Publish"}
                  </Button>
                ) : null}
                {program.status === "ACTIVE" ? (
                  <Button variant="destructive" onClick={() => setPendingAction("close")} disabled={isMutating}>
                    {isMutating ? "Closing..." : "Close Program"}
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !isSaving && !isMutating) {
            setPendingAction(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "save"
                ? "Save draft changes?"
                : pendingAction === "publish"
                  ? "Publish program?"
                  : "Close program?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "save"
                ? "This will update the current draft configuration for the program."
                : pendingAction === "publish"
                  ? "Publishing makes the program visible to students for applications."
                  : "Closing immediately blocks new submissions while preserving existing records."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving || isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={pendingAction === "close" ? "bg-red-500 hover:bg-red-700" : undefined}
              onClick={() => {
                if (pendingAction === "save") {
                  void saveDraftChanges();
                  return;
                }

                if (pendingAction === "publish") {
                  void publishProgram();
                  return;
                }

                if (pendingAction === "close") {
                  void closeProgram();
                }
              }}
              disabled={isSaving || isMutating}
            >
              {pendingAction === "save"
                ? isSaving
                  ? "Saving..."
                  : "Confirm Save"
                : pendingAction === "publish"
                  ? isMutating
                    ? "Publishing..."
                    : "Confirm Publish"
                  : isMutating
                    ? "Closing..."
                    : "Confirm Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
