"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getProgramById } from "@/lib/student-data";
import { useApplicationWizardStore } from "@/store/application-wizard-store";

const sectionOrder = ["section-a", "section-b", "section-c", "section-d", "section-e", "section-f"] as const;

export default function ApplyEntryPage() {
  const params = useParams<{ programId: string }>();
  const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
  const resetProgram = useApplicationWizardStore((state) => state.resetProgram);
  const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
  const program = getProgramById(params.programId);

  useEffect(() => {
    hydrateProgram(params.programId);
  }, [hydrateProgram, params.programId]);

  const resumeHref = useMemo(() => {
    if (!programState) {
      return `/apply/${params.programId}/section-a` as Route;
    }

    const firstIncomplete = sectionOrder.find((section) => !programState.completion[section]);
    if (!firstIncomplete) {
      return `/apply/${params.programId}/preview` as Route;
    }

    return `/apply/${params.programId}/${firstIncomplete}` as Route;
  }, [programState, params.programId]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-2xl font-semibold text-brand-900">{program?.name ?? "Application Wizard"}</h2>
      <p className="mt-2 text-sm text-gray-600">
        Sections A-F are now active. Continue from your latest incomplete section or restart a fresh draft.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={resumeHref}>
          <Button>{programState?.lastSavedAt ? "Resume Application" : "Start Application"}</Button>
        </Link>
        <Button variant="outline" onClick={() => resetProgram(params.programId)}>
          Reset Draft
        </Button>
      </div>
    </section>
  );
}
