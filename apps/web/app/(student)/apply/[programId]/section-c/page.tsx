"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/forms/form-section";
import { type SiblingRow, SiblingTable } from "@/components/forms/sibling-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldGroup } from "@/components/forms/field-group";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useStudentProfile } from "@/hooks/use-student-profile";
import { useApplicationWizardStore } from "@/store/application-wizard-store";
import { mapProfileToSectionC } from "@/lib/profile-to-form-mapper";

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

const GUARDIAN_RELATIONSHIP_VALUES = [
	'Father',
	'Mother',
	'Uncle',
	'Aunt',
	'Grandparent',
	'Brother',
	'Sister',
	'Relative',
	'Guardian',
	'Sponsor',
] as const;

const FAMILY_STATUS_VALUES = [
	'BOTH_PARENTS_ALIVE',
	'SINGLE_PARENT',
	'ORPHAN',
	'PERSON_WITH_DISABILITY',
] as const;

export default function ApplySectionCPage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
  const setSectionData = useApplicationWizardStore((state) => state.setSectionData);
  const setSectionComplete = useApplicationWizardStore((state) => state.setSectionComplete);
  const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
  const { profile, isLoading: profileLoading } = useStudentProfile();
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
    // Auto-fill from profile if available, stored data takes precedence
    const profileData = profile ? mapProfileToSectionC(profile) : {};
    setForm({
      ...defaultForm,
      ...profileData,
      ...stored,
      siblings: Array.isArray(stored.siblings) ? stored.siblings : [],
    });
    didHydrate.current = true;
  }, [programState, profile]);

  // If profile loads later, update the form with profile data
  useEffect(() => {
    if (!didHydrate.current || !profile || profileLoading) {
      return;
    }

    const stored = programState?.sectionData["section-c"] as Partial<SectionCForm> || {};
    const profileData = mapProfileToSectionC(profile);
    setForm(prev => ({
      ...defaultForm,
      ...profileData,
      ...stored,
      ...prev,
      siblings: Array.isArray(stored.siblings) ? stored.siblings : [],
    }));
  }, [profile, profileLoading, programState]);

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
            <Select
              value={form.familyStatus}
              onValueChange={(value) => setForm({ ...form, familyStatus: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select family status" />
              </SelectTrigger>
              <SelectContent>
                {FAMILY_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Guardian/Parent Name</span>
            <Input value={form.guardianName} onChange={(event) => setForm({ ...form, guardianName: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Relationship</span>
            <Select
              value={form.guardianRelationship}
              onValueChange={(value) => setForm({ ...form, guardianRelationship: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {GUARDIAN_RELATIONSHIP_VALUES.map((relationship) => (
                  <SelectItem key={relationship} value={relationship}>
                    {relationship}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
