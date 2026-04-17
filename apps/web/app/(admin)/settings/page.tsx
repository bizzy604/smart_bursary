"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save form customization settings.",
      });
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
          <Link href="/settings/branding" className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
            <p className="font-semibold">Branding & County Identity</p>
            <p className="mt-1 text-brand-700">Update county name, fund title, legal reference, and visual tokens.</p>
          </Link>
          <Link href="/settings/ai-scoring" className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
            <p className="font-semibold">AI Scoring Weights</p>
            <p className="mt-1 text-brand-700">Control score dimension priorities per county policy.</p>
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
                  ? "border border-success-200 bg-success-50 text-success-700"
                  : "border border-danger-200 bg-danger-50 text-danger-700"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-gray-700">Colour Scheme</span>
              <select
                value={formCustomization.colorScheme}
                onChange={(event) =>
                  setFormCustomization((current) => ({
                    ...current,
                    colorScheme: event.target.value as FormCustomizationSettings["colorScheme"],
                  }))
                }
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="COUNTY_PRIMARY">County Primary</option>
                <option value="NEUTRAL">Neutral</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-gray-700">Logo Placement</span>
              <select
                value={formCustomization.logoPlacement}
                onChange={(event) =>
                  setFormCustomization((current) => ({
                    ...current,
                    logoPlacement: event.target.value as FormCustomizationSettings["logoPlacement"],
                  }))
                }
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="HEADER_LEFT">Header Left</option>
                <option value="HEADER_CENTER">Header Center</option>
                <option value="HEADER_RIGHT">Header Right</option>
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Section Order</p>
            <div className="space-y-2">
              {formCustomization.sectionOrder.map((section, index) => (
                <div key={section} className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-sm text-gray-800">{SECTION_LABELS[section]}</span>
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
