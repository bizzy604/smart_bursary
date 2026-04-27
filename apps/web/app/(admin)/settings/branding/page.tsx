"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCounty } from "@/hooks/use-county";
import { API_BASE_URL } from "@/lib/constants";
import {
  fetchAdminSettings,
  type BrandingSettings,
  updateAdminSettings,
} from "@/lib/admin-settings";
import { waitForToken } from "@/lib/api-client";

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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
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

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setFeedback(null);

    try {
      const token = await waitForToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/documents/county-logo`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        console.error("Upload failed:", body);
        const message = body?.error?.message || body?.message || "Failed to upload logo.";
        throw new Error(message);
      }

      const result = (await response.json()) as { s3Key?: string };
      console.log("Upload result:", result);
      if (!result.s3Key) {
        throw new Error("Upload completed but no key was returned.");
      }

      // Update local state with the S3 key - user must click Save to persist
      setBranding((current) => ({ ...current, logoS3Key: result.s3Key as string }));
      setFeedback({ type: "success", message: "Logo uploaded. Click 'Save Branding' to persist." });
      toast.success("Logo uploaded", { description: "Click 'Save Branding' to save the logo to your settings." });
    } catch (error: unknown) {
      console.error("Logo upload error:", error);
      const message = error instanceof Error ? error.message : "Logo upload failed.";
      setFeedback({ type: "error", message });
      toast.error("Upload failed", { description: message });
    } finally {
      setIsUploadingLogo(false);
      // Reset the input so the same file can be selected again
      event.target.value = "";
    }
  }

  async function saveBrandingSettings() {
    setIsSaving(true);
    setFeedback(null);

    try {
      // Remove logoUrl from branding before sending to backend (it's computed, not persisted)
      const { logoUrl, ...brandingToSave } = branding;
      const updated = await updateAdminSettings({ branding: brandingToSave });
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

            <div className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-foreground/90">County Logo</span>
              <div className="flex items-center gap-3">
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt="County logo preview"
                    className="h-12 w-12 rounded-md border border-border object-contain"
                  />
                ) : branding.logoS3Key ? (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted text-xs text-muted-foreground">
                    Logo
                  </div>
                ) : null}
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoUpload}
                    disabled={isLoading || isUploadingLogo}
                    className="hidden"
                  />
                  <span className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                    {isUploadingLogo ? "Uploading..." : branding.logoS3Key ? "Replace Logo" : "Upload Logo"}
                  </span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Supported formats: PNG, JPEG. Max 5 MB.</p>
            </div>

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
