"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { StepProgress } from "@/components/forms/step-progress";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useApplication } from "@/hooks/use-application";
import { getWizardSteps } from "@/lib/wizard";
import { useApplicationWizardStore, type SectionSlug } from "@/store/application-wizard-store";

const wizardSections: SectionSlug[] = ["section-a", "section-b", "section-c", "section-d", "section-e", "section-f"];

export default function ApplyWizardLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ programId: string }>();
  const pathname = usePathname();
  const { getProgramById, isLoading, error } = useApplication();
  const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
  const completion = useApplicationWizardStore((state) => state.programs[params.programId]?.completion);
  const program = getProgramById(params.programId);

  useEffect(() => {
    hydrateProgram(params.programId);
  }, [hydrateProgram, params.programId]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">
        Loading application wizard...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </section>
    );
  }

  if (!program) {
    return (
      <EmptyState
        title="Program not found"
        description="This application program is unavailable. Return to open programs and start again."
        action={
          <Link href="/programs">
            <Button>Back to Programs</Button>
          </Link>
        }
      />
    );
  }

  const steps = getWizardSteps(params.programId);
  const completedSections = wizardSections.filter((section) => Boolean(completion?.[section]));
  const currentStep = steps.find((step) => pathname === step.href || pathname.startsWith(`${step.href}/`))?.key ?? "section-a";

  return (
    <main className="space-y-4">
      <section className="rounded-2xl border border-county-primary/20 bg-background p-4 shadow-xs sm:p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-county-primary">Application Wizard</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-primary">{program.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete all sections before preview and submission. Your draft is auto-saved as you edit.
        </p>
      </section>

      <StepProgress steps={steps} currentKey={currentStep} completedKeys={completedSections} />

      {children}
    </main>
  );
}