"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_SCORING_WEIGHTS,
  fetchScoringWeights,
  type ScoringWeights,
  updateScoringWeights,
} from "@/lib/admin-settings";

const dimensions: Array<{ key: keyof ScoringWeights; label: string; helper: string }> = [
  { key: "family_status", label: "Family Status", helper: "Prioritizes orphanhood, single-parent, and disability context." },
  { key: "family_income", label: "Family Income", helper: "Weights household income pressure and affordability constraints." },
  { key: "education_burden", label: "Education Burden", helper: "Reflects dependants and education-related financial load." },
  { key: "academic_standing", label: "Academic Standing", helper: "Considers progression and institutional context." },
  { key: "document_quality", label: "Document Quality", helper: "Rewards complete, verifiable, and recent supporting evidence." },
  { key: "integrity", label: "Integrity Checks", helper: "Accounts for anomaly and consistency checks." },
];

function clampWeight(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(0.4, Math.max(0, Number(value.toFixed(4))));
}

export default function AiScoringSettingsPage() {
  const [weights, setWeights] = useState<ScoringWeights>({ ...DEFAULT_SCORING_WEIGHTS });
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const totalWeight = useMemo(
    () => dimensions.reduce((sum, dimension) => sum + weights[dimension.key], 0),
    [weights],
  );
  const totalPercent = Math.round(totalWeight * 1000) / 10;
  const canSave = Math.abs(totalWeight - 1) < 0.0001;

  useEffect(() => {
    let mounted = true;

    void fetchScoringWeights()
      .then((result) => {
        if (!mounted) {
          return;
        }
        setWeights(result.weights);
        setLastUpdatedAt(result.scoringWeightsUpdatedAt);
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to load scoring weights.",
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

  async function saveWeights() {
    if (!canSave) {
      setFeedback({ type: "error", message: "All weights must sum to exactly 100%." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await updateScoringWeights(weights);
      setWeights(response.weights);
      setLastUpdatedAt(response.scoringWeightsUpdatedAt);
      setFeedback({ type: "success", message: "Scoring weights saved for the next intake cycle." });
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save scoring weights.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>AI Scoring Weights</CardTitle>
          <CardDescription>
            Adjust the contribution of each scoring dimension. Changes apply to subsequent scoring runs.
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

          <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900">
            <p>
              Total: <strong>{totalPercent}%</strong>
               {!canSave ? " (must be exactly 100%)" : ""}
            </p>
            {lastUpdatedAt ? <p className="mt-1 text-brand-700">Last updated: {new Date(lastUpdatedAt).toLocaleString()}</p> : null}
          </div>

          <div className="space-y-4">
            {dimensions.map((dimension) => {
              const value = weights[dimension.key];
              const percent = Math.round(value * 1000) / 10;

              return (
                <div key={dimension.key} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-brand-900">{dimension.label}</p>
                      <p className="mt-1 text-xs text-gray-600">{dimension.helper}</p>
                    </div>
                    <p className="text-sm font-semibold text-brand-900">{percent}%</p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px] sm:items-center">
                    <input
                      type="range"
                      min={0}
                      max={0.4}
                      step={0.01}
                      value={value}
                      onChange={(event) => {
                        const parsed = clampWeight(Number(event.target.value));
                        setWeights((current) => ({ ...current, [dimension.key]: parsed }));
                      }}
                      disabled={isLoading}
                      className="h-2 w-full cursor-pointer accent-county-primary"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={0.4}
                      step={0.01}
                      value={value}
                      onChange={(event) => {
                        const parsed = clampWeight(Number(event.target.value));
                        setWeights((current) => ({ ...current, [dimension.key]: parsed }));
                      }}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setWeights({ ...DEFAULT_SCORING_WEIGHTS })}
              disabled={isLoading || isSaving}
            >
              Reset Defaults
            </Button>
            <Button onClick={saveWeights} disabled={isLoading || isSaving || !canSave}>
              {isSaving ? "Saving..." : "Save Weights"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
