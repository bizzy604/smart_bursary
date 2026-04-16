"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DocumentUpload, type UploadedDocument } from "@/components/forms/document-upload";
import { FieldGroup } from "@/components/forms/field-group";
import { FormSection } from "@/components/forms/form-section";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useApplicationWizardStore } from "@/store/application-wizard-store";

interface SectionFForm {
  documents: UploadedDocument[];
  additionalNotes: string;
}

const defaultForm: SectionFForm = {
  documents: [],
  additionalNotes: "",
};

export default function ApplySectionFPage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
  const setSectionData = useApplicationWizardStore((state) => state.setSectionData);
  const setSectionComplete = useApplicationWizardStore((state) => state.setSectionComplete);
  const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
  const didHydrate = useRef(false);
  const [form, setForm] = useState<SectionFForm>(defaultForm);

  useEffect(() => {
    hydrateProgram(params.programId);
  }, [hydrateProgram, params.programId]);

  useEffect(() => {
    if (!programState || didHydrate.current) {
      return;
    }

    const stored = programState.sectionData["section-f"] as Partial<SectionFForm>;
    setForm({
      ...defaultForm,
      ...stored,
      documents: Array.isArray(stored.documents) ? stored.documents : [],
    });
    didHydrate.current = true;
  }, [programState]);

  const isUnlocked = Boolean(programState?.completion["section-e"]);
  const isValid = form.documents.length >= 3;

  useEffect(() => {
    setSectionComplete(params.programId, "section-f", isValid);
  }, [isValid, params.programId, setSectionComplete]);

  const saveDraft = useCallback(
    (value: SectionFForm) => {
      setSectionData(params.programId, "section-f", value);
    },
    [params.programId, setSectionData],
  );

  const saveStatus = useAutoSave({
    value: form,
    onSave: saveDraft,
    enabled: Boolean(programState),
  });

  if (!programState) {
    return <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading section...</section>;
  }

  if (!isUnlocked) {
    return (
      <section className="rounded-2xl border border-warning-100 bg-warning-50 p-6">
        <h2 className="font-display text-xl font-semibold text-warning-700">Complete Section E First</h2>
        <p className="mt-2 text-sm text-warning-700">Document upload unlocks after declarations are confirmed.</p>
        <div className="mt-4">
          <Link href={`/apply/${params.programId}/section-e`}>
            <Button>Go to Section E</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FormSection
      title="Section F: Supporting Documents"
      description="Upload all required attachments before moving to preview. At least three required files must be selected."
      backHref={`/apply/${params.programId}/section-e` as Route}
      nextLabel="Continue to Preview"
      saveStatus={saveStatus}
      isNextDisabled={!isValid}
      onNext={() => {
        if (!isValid) {
          return;
        }

        setSectionData(params.programId, "section-f", form);
        setSectionComplete(params.programId, "section-f", true);
        router.push(`/apply/${params.programId}/preview` as Route);
      }}
    >
      <FieldGroup title="Required Attachments">
        <DocumentUpload value={form.documents} onChange={(documents) => setForm({ ...form, documents })} />
      </FieldGroup>

      <FieldGroup title="Additional Notes (Optional)">
        <textarea
          value={form.additionalNotes}
          onChange={(event) => setForm({ ...form, additionalNotes: event.target.value })}
          className="min-h-[120px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs transition-colors placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
          placeholder="Any extra context for reviewers can be provided here."
        />
      </FieldGroup>
    </FormSection>
  );
}
