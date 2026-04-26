"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCounty } from "@/hooks/use-county";
import {
  fetchAdminSettings,
  type BrandingSettings,
  updateAdminSettings,
} from "@/lib/admin-settings";

const defaultBranding: BrandingSettings = {
  countyName: "",
  fundName: "",
  legalReference: "",
  primaryColor: "#1E3A5F",
  logoText: "",
  logoS3Key: "",
};

export default function BrandingSettingsPage() {
  const { setCounty } = useCounty();
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
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
        setBranding(settings.branding);
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to load branding settings.",
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

  async function saveBrandingSettings() {
    setIsSaving(true);
    setFeedback(null);

    try {
      const updated = await updateAdminSettings({ branding });
      setBranding(updated.branding);
      setCounty({
        name: updated.branding.countyName,
        fundName: updated.branding.fundName,
        logoText: updated.branding.logoText,
        primaryColor: updated.branding.primaryColor,
        legalReference: updated.branding.legalReference,
      });
      setFeedback({ type: "success", message: "Branding settings saved." });
      toast.success("Branding saved", { description: "Your county branding settings were updated." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save branding settings.";
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
          <CardTitle>County Branding</CardTitle>
          <CardDescription>
            Configure county identity tokens used across headers, student surfaces, and generated PDFs.
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
              <span className="font-medium text-foreground/90">County Name</span>
              <Input
                value={branding.countyName}
                onChange={(event) => setBranding((current) => ({ ...current, countyName: event.target.value }))}
                disabled={isLoading}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground/90">Fund Name</span>
              <Input
                value={branding.fundName}
                onChange={(event) => setBranding((current) => ({ ...current, fundName: event.target.value }))}
                disabled={isLoading}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground/90">Legal Reference</span>
              <Input
                value={branding.legalReference}
                onChange={(event) =>
                  setBranding((current) => ({ ...current, legalReference: event.target.value }))
                }
                disabled={isLoading}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground/90">Logo Text (Fallback)</span>
              <Input
                maxLength={8}
                value={branding.logoText}
                onChange={(event) => setBranding((current) => ({ ...current, logoText: event.target.value }))}
                disabled={isLoading}
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-foreground/90">Logo Storage Key</span>
              <Input
                placeholder="county-assets/turkana/logo.png"
                value={branding.logoS3Key}
                onChange={(event) => setBranding((current) => ({ ...current, logoS3Key: event.target.value }))}
                disabled={isLoading}
              />
            </label>

            <div className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-foreground/90">Primary Colour</span>
              <div className="grid gap-3 sm:grid-cols-[88px_minmax(0,1fr)]">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(event) =>
                    setBranding((current) => ({ ...current, primaryColor: event.target.value.toUpperCase() }))
                  }
                  disabled={isLoading}
                  className="h-11 w-full cursor-pointer rounded-md border border-border bg-background p-1"
                />
                <Input
                  value={branding.primaryColor}
                  onChange={(event) =>
                    setBranding((current) => ({ ...current, primaryColor: event.target.value }))
                  }
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div
            className="rounded-xl border px-4 py-3"
            style={{ borderColor: branding.primaryColor, backgroundColor: `${branding.primaryColor}12` }}
          >
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Live Preview</p>
            <p className="mt-2 font-serif text-lg font-semibold" style={{ color: branding.primaryColor }}>
              {branding.countyName || "County Name"} - {branding.fundName || "Fund Name"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Legal Ref: {branding.legalReference || "-"}</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveBrandingSettings} disabled={isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save Branding"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
