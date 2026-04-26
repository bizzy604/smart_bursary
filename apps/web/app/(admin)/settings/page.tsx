"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchAdminSettings,
  FORM_SECTION_ORDER,
  SECTION_LABELS,
  type FormCustomizationSettings,
  type SectionKey,
  updateAdminSettings,
} from "@/lib/admin-settings";

const defaultFormCustomization: FormCustomizationSettings = {
  colorScheme: "COUNTY_PRIMARY",
  logoPlacement: "HEADER_CENTER",
  sectionOrder: [...FORM_SECTION_ORDER],
};

function moveSection(order: SectionKey[], index: number, direction: -1 | 1): SectionKey[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= order.length) {
    return order;
  }

  const nextOrder = [...order];
  const [target] = nextOrder.splice(index, 1);
  nextOrder.splice(nextIndex, 0, target);
  return nextOrder;
}

export default function SettingsHomePage() {
  const [countyName, setCountyName] = useState("County");
  const [formCustomization, setFormCustomization] = useState<FormCustomizationSettings>(
    defaultFormCustomization,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    void fetchAdminSettings()
      .then((settings) => {
        if (!mounted) {
          return;
        }

        setCountyName(settings.branding.countyName);
        setFormCustomization(settings.formCustomization);
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }

        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to load county settings.",
        });
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function saveFormCustomization() {
    setIsSaving(true);
    setFeedback(null);

    try {
      const updated = await updateAdminSettings({
        formCustomization,
      });

      setFormCustomization(updated.formCustomization);
      setFeedback({ type: "success", message: "Form customization settings saved." });
      toast.success("Settings saved", { description: "Form customization was updated." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save form customization settings.";
      setFeedback({ type: "error", message });
      toast.error("Save failed", { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>County Settings</CardTitle>
          <CardDescription>
            Manage tenant-level controls for {countyName}. Configure branding, form behavior, and scoring policy.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Link href={"/county/programs" as Route} className="rounded-lg border border-secondary/30 bg-secondary/10 p-4 text-sm text-primary">
            <p className="font-semibold">Program Management</p>
            <p className="mt-1 text-secondary">Create, edit, publish, and close bursary intake programs.</p>
          </Link>
          <Link href="/settings/branding" className="rounded-lg border border-secondary/30 bg-secondary/10 p-4 text-sm text-primary">
            <p className="font-semibold">Branding & County Identity</p>
            <p className="mt-1 text-secondary">Update county name, fund title, legal reference, and visual tokens.</p>
          </Link>
          <Link href="/settings/ai-scoring" className="rounded-lg border border-secondary/30 bg-secondary/10 p-4 text-sm text-primary">
            <p className="font-semibold">AI Scoring Weights</p>
            <p className="mt-1 text-secondary">Control score dimension priorities per county policy.</p>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Customization</CardTitle>
          <CardDescription>
            Choose approved appearance and section order options for county application forms.
          </CardDescription>
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
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground/90">Colour Scheme</span>
              <select
                value={formCustomization.colorScheme}
                onChange={(event) =>
                  setFormCustomization((current) => ({
                    ...current,
                    colorScheme: event.target.value as FormCustomizationSettings["colorScheme"],
                  }))
                }
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="COUNTY_PRIMARY">County Primary</option>
                <option value="NEUTRAL">Neutral</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground/90">Logo Placement</span>
              <select
                value={formCustomization.logoPlacement}
                onChange={(event) =>
                  setFormCustomization((current) => ({
                    ...current,
                    logoPlacement: event.target.value as FormCustomizationSettings["logoPlacement"],
                  }))
                }
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="HEADER_LEFT">Header Left</option>
                <option value="HEADER_CENTER">Header Center</option>
                <option value="HEADER_RIGHT">Header Right</option>
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground/90">Section Order</p>
            <div className="space-y-2">
              {formCustomization.sectionOrder.map((section, index) => (
                <div key={section} className="flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2">
                  <span className="text-sm text-foreground">{SECTION_LABELS[section]}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={index === 0 || isLoading}
                      onClick={() =>
                        setFormCustomization((current) => ({
                          ...current,
                          sectionOrder: moveSection(current.sectionOrder, index, -1),
                        }))
                      }
                    >
                      Up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={index === formCustomization.sectionOrder.length - 1 || isLoading}
                      onClick={() =>
                        setFormCustomization((current) => ({
                          ...current,
                          sectionOrder: moveSection(current.sectionOrder, index, 1),
                        }))
                      }
                    >
                      Down
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveFormCustomization} disabled={isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save Form Customization"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
