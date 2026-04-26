"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FieldGroup } from "@/components/forms/field-group";
import { FormSection } from "@/components/forms/form-section";
import { type SiblingRow, SiblingTable } from "@/components/forms/sibling-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useApplicationWizardStore } from "@/store/application-wizard-store";

interface SectionCForm {
  familyStatus: string;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianOccupation: string;
  householdSize: string;
  dependantsInSchool: string;
  siblings: SiblingRow[];
}

const defaultForm: SectionCForm = {
  familyStatus: "",
  guardianName: "",
  guardianRelationship: "",
  guardianPhone: "",
  guardianOccupation: "",
  householdSize: "",
  dependantsInSchool: "",
  siblings: [],
};

export default function ApplySectionCPage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
  const setSectionData = useApplicationWizardStore((state) => state.setSectionData);
  const setSectionComplete = useApplicationWizardStore((state) => state.setSectionComplete);
  const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
  const didHydrate = useRef(false);
  const [form, setForm] = useState<SectionCForm>(defaultForm);

  useEffect(() => {
    hydrateProgram(params.programId);
  }, [hydrateProgram, params.programId]);

  useEffect(() => {
    if (!programState || didHydrate.current) {
      return;
    }

    const stored = programState.sectionData["section-c"] as Partial<SectionCForm>;
    setForm({
      ...defaultForm,
      ...stored,
      siblings: Array.isArray(stored.siblings) ? stored.siblings : [],
    });
    didHydrate.current = true;
  }, [programState]);

  const isUnlocked = Boolean(programState?.completion["section-b"]);
  const isValid =
    form.familyStatus.trim().length > 0 &&
    form.guardianName.trim().length > 2 &&
    form.guardianRelationship.trim().length > 1 &&
    form.guardianPhone.trim().length >= 10 &&
    Number(form.householdSize || 0) > 0;

  useEffect(() => {
    setSectionComplete(params.programId, "section-c", isValid);
  }, [isValid, params.programId, setSectionComplete]);

  const saveDraft = useCallback(
    (value: SectionCForm) => {
      setSectionData(params.programId, "section-c", value);
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
        <h2 className="font-serif text-xl font-semibold text-amber-700">Complete Section B First</h2>
        <p className="mt-2 text-sm text-amber-700">Section C unlocks after you provide bursary amount details.</p>
        <div className="mt-4">
          <Link href={`/apply/${params.programId}/section-b`}>
            <Button>Go to Section B</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FormSection
      title="Section C: Family Information"
      description="Provide household and sibling education context to support means-testing accuracy."
      backHref={`/apply/${params.programId}/section-b` as Route}
      saveStatus={saveStatus}
      isNextDisabled={!isValid}
      onNext={() => {
        if (!isValid) {
          return;
        }

        setSectionData(params.programId, "section-c", form);
        setSectionComplete(params.programId, "section-c", true);
        router.push(`/apply/${params.programId}/section-d` as Route);
      }}
    >
      <FieldGroup title="Guardian / Parent Details">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-foreground/90 md:col-span-2">
            <span className="font-medium">Family Status</span>
            <select
              value={form.familyStatus}
              onChange={(event) => setForm({ ...form, familyStatus: event.target.value })}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-xs transition-colors focus-visible:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30"
            >
              <option value="">Select family status</option>
              <option value="BOTH_PARENTS_ALIVE">Both Parents Alive</option>
              <option value="SINGLE_PARENT">Single Parent</option>
              <option value="ORPHAN">Orphan</option>
              <option value="PERSON_WITH_DISABILITY">Person With Disability</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Guardian/Parent Name</span>
            <Input value={form.guardianName} onChange={(event) => setForm({ ...form, guardianName: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Relationship</span>
            <Input
              value={form.guardianRelationship}
              onChange={(event) => setForm({ ...form, guardianRelationship: event.target.value })}
              placeholder="e.g. Mother, Uncle"
            />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Phone Number</span>
            <Input value={form.guardianPhone} onChange={(event) => setForm({ ...form, guardianPhone: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Occupation</span>
            <Input
              value={form.guardianOccupation}
              onChange={(event) => setForm({ ...form, guardianOccupation: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Total Household Members</span>
            <Input
              type="number"
              value={form.householdSize}
              onChange={(event) => setForm({ ...form, householdSize: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Dependants in School</span>
            <Input
              type="number"
              value={form.dependantsInSchool}
              onChange={(event) => setForm({ ...form, dependantsInSchool: event.target.value })}
            />
          </label>
        </div>
      </FieldGroup>

      <FieldGroup title="Siblings in Education" description="Add all siblings currently in school, college, or university.">
        <SiblingTable rows={form.siblings} onChange={(siblings) => setForm({ ...form, siblings })} />
      </FieldGroup>
    </FormSection>
  );
}
