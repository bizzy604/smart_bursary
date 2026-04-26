"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FieldGroup } from "@/components/forms/field-group";
import { FormSection } from "@/components/forms/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useApplicationWizardStore } from "@/store/application-wizard-store";

interface SectionEForm {
  hasOtherBursary: boolean;
  otherBursaryDetails: string;
  hasDisabilityNeeds: boolean;
  disabilityDetails: string;
  declarationName: string;
  confirmTruth: boolean;
  authorizeVerification: boolean;
  acceptPrivacyPolicy: boolean;
}

const defaultForm: SectionEForm = {
  hasOtherBursary: false,
  otherBursaryDetails: "",
  hasDisabilityNeeds: false,
  disabilityDetails: "",
  declarationName: "",
  confirmTruth: false,
  authorizeVerification: false,
  acceptPrivacyPolicy: false,
};

export default function ApplySectionEPage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
  const setSectionData = useApplicationWizardStore((state) => state.setSectionData);
  const setSectionComplete = useApplicationWizardStore((state) => state.setSectionComplete);
  const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
  const didHydrate = useRef(false);
  const [form, setForm] = useState<SectionEForm>(defaultForm);

  useEffect(() => {
    hydrateProgram(params.programId);
  }, [hydrateProgram, params.programId]);

  useEffect(() => {
    if (!programState || didHydrate.current) {
      return;
    }

    const stored = programState.sectionData["section-e"] as Partial<SectionEForm>;
    setForm({ ...defaultForm, ...stored });
    didHydrate.current = true;
  }, [programState]);

  const isUnlocked = Boolean(programState?.completion["section-d"]);
  const disclosuresValid = (!form.hasOtherBursary || form.otherBursaryDetails.trim().length > 3) &&
    (!form.hasDisabilityNeeds || form.disabilityDetails.trim().length > 3);
  const isValid =
    disclosuresValid &&
    form.declarationName.trim().length > 2 &&
    form.confirmTruth &&
    form.authorizeVerification &&
    form.acceptPrivacyPolicy;

  useEffect(() => {
    setSectionComplete(params.programId, "section-e", isValid);
  }, [isValid, params.programId, setSectionComplete]);

  const saveDraft = useCallback(
    (value: SectionEForm) => {
      setSectionData(params.programId, "section-e", value);
    },
    [params.programId, setSectionData],
  );

  const saveStatus = useAutoSave({
    value: form,
    onSave: saveDraft,
    enabled: Boolean(programState),
  });

  if (!programState) {
    return <section className="rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">Loading section...</section>;
  }

  if (!isUnlocked) {
    return (
      <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
        <h2 className="font-serif text-xl font-semibold text-amber-700">Complete Section D First</h2>
        <p className="mt-2 text-sm text-amber-700">Declarations unlock after financial details are captured.</p>
        <div className="mt-4">
          <Link href={`/apply/${params.programId}/section-d`}>
            <Button>Go to Section D</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FormSection
      title="Section E: Disclosures and Declarations"
      description="Declare additional support, special needs, and provide your formal applicant declaration."
      backHref={`/apply/${params.programId}/section-d` as Route}
      saveStatus={saveStatus}
      isNextDisabled={!isValid}
      onNext={() => {
        if (!isValid) {
          return;
        }

        setSectionData(params.programId, "section-e", form);
        setSectionComplete(params.programId, "section-e", true);
        router.push(`/apply/${params.programId}/section-f` as Route);
      }}
    >
      <FieldGroup title="Additional Disclosures">
        <div className="space-y-4">
          <label className="flex items-start gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={form.hasOtherBursary}
              onChange={(event) => setForm({ ...form, hasOtherBursary: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>I am receiving support from another bursary or scholarship source.</span>
          </label>
          {form.hasOtherBursary ? (
            <textarea
              value={form.otherBursaryDetails}
              onChange={(event) => setForm({ ...form, otherBursaryDetails: event.target.value })}
              className="min-h-[110px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30"
              placeholder="Provide bursary source and annual amount."
            />
          ) : null}

          <label className="flex items-start gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={form.hasDisabilityNeeds}
              onChange={(event) => setForm({ ...form, hasDisabilityNeeds: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>I have disability-related or special support needs relevant to this application.</span>
          </label>
          {form.hasDisabilityNeeds ? (
            <textarea
              value={form.disabilityDetails}
              onChange={(event) => setForm({ ...form, disabilityDetails: event.target.value })}
              className="min-h-[110px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30"
              placeholder="Describe accommodation or support requirements."
            />
          ) : null}
        </div>
      </FieldGroup>

      <FieldGroup title="Applicant Declaration">
        <label className="space-y-1 text-sm text-foreground/90">
          <span className="font-medium">Declaration Full Name</span>
          <Input
            value={form.declarationName}
            onChange={(event) => setForm({ ...form, declarationName: event.target.value })}
          />
        </label>

        <div className="space-y-2 text-sm text-foreground/90">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={form.confirmTruth}
              onChange={(event) => setForm({ ...form, confirmTruth: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>I confirm that all information provided is true and complete.</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={form.authorizeVerification}
              onChange={(event) => setForm({ ...form, authorizeVerification: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>I authorize verification with my school and local administration offices.</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={form.acceptPrivacyPolicy}
              onChange={(event) => setForm({ ...form, acceptPrivacyPolicy: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>I accept county privacy and data processing terms for this bursary program.</span>
          </label>
        </div>
      </FieldGroup>
    </FormSection>
  );
}
