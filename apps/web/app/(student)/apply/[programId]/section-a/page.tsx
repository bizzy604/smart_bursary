"use client";

import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/forms/form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldGroup } from "@/components/forms/field-group";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useStudentProfile } from "@/hooks/use-student-profile";
import { useApplicationWizardStore } from "@/store/application-wizard-store";
import { useSubCounties, useWards, useVillageUnits } from "@/hooks/use-locations";
import { mapProfileToSectionA } from "@/lib/profile-to-form-mapper";
import { applicationSectionASchema } from "@/lib/validators";

interface SectionAForm {
  fullName: string;
  nationalIdOrBirthCert: string;
  phone: string;
  email: string;
  institution: string;
  admissionNumber: string;
  course: string;
  yearOfStudy: string;
  subCountyId: string;
  wardId: string;
  villageUnitId: string;
}

const defaultForm: SectionAForm = {
  fullName: "",
  nationalIdOrBirthCert: "",
  phone: "",
  email: "",
  institution: "",
  admissionNumber: "",
  course: "",
  yearOfStudy: "",
  subCountyId: "",
  wardId: "",
  villageUnitId: "",
};

const YEAR_OF_STUDY_VALUES = [
	'Year 1',
	'Year 2',
	'Year 3',
	'Year 4',
	'Year 5',
	'Year 6',
	'Final Year',
] as const;

export default function ApplySectionAPage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
  const setSectionData = useApplicationWizardStore((state) => state.setSectionData);
  const setSectionComplete = useApplicationWizardStore((state) => state.setSectionComplete);
  const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
  const { profile, isLoading: profileLoading, error: profileError } = useStudentProfile();
  const didHydrate = useRef(false);
  const [form, setForm] = useState<SectionAForm>(defaultForm);

  useEffect(() => {
    hydrateProgram(params.programId);
  }, [hydrateProgram, params.programId]);

  useEffect(() => {
    if (!programState || didHydrate.current) {
      return;
    }

    const stored = programState.sectionData["section-a"] as Partial<SectionAForm>;
    // Auto-fill from profile if available, stored data takes precedence
    const profileData = profile ? mapProfileToSectionA(profile) : {};
    setForm({ ...defaultForm, ...profileData, ...stored });
    didHydrate.current = true;
  }, [programState, profile]);

  // If profile loads later, update the form with profile data
  useEffect(() => {
    if (!didHydrate.current || !profile || profileLoading) {
      return;
    }

    const stored = programState?.sectionData["section-a"] as Partial<SectionAForm> || {};
    const profileData = mapProfileToSectionA(profile);
    setForm(prev => ({ ...defaultForm, ...profileData, ...stored, ...prev }));
  }, [profile, profileLoading, programState]);

  const isValid = applicationSectionASchema.safeParse(form).success;

  useEffect(() => {
    setSectionComplete(params.programId, "section-a", isValid);
  }, [isValid, params.programId, setSectionComplete]);

  const saveDraft = useCallback(
    (value: SectionAForm) => {
      setSectionData(params.programId, "section-a", value);
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

  return (
    <FormSection
      title="Section A: Personal and Academic Information"
      description="Provide your current student and contact details exactly as they appear on official records."
      saveStatus={saveStatus}
      isNextDisabled={!isValid}
      onNext={() => {
        if (!isValid) {
          return;
        }

        setSectionData(params.programId, "section-a", form);
        setSectionComplete(params.programId, "section-a", true);
        router.push(`/apply/${params.programId}/section-b` as Route);
      }}
    >
      <FieldGroup title="Applicant Identity">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Full Name</span>
            <Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">National ID / Birth Cert No.</span>
            <Input
              value={form.nationalIdOrBirthCert}
              onChange={(event) => setForm({ ...form, nationalIdOrBirthCert: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Phone Number</span>
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Email Address</span>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
        </div>
      </FieldGroup>

      <LocationFields form={form} setForm={setForm} />

      <FieldGroup title="Academic Profile">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-foreground/90 md:col-span-2">
            <span className="font-medium">Institution</span>
            <Input value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Admission Number</span>
            <Input
              value={form.admissionNumber}
              onChange={(event) => setForm({ ...form, admissionNumber: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Course / Class</span>
            <Input value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-foreground/90">
            <span className="font-medium">Year of Study</span>
            <Select
              value={form.yearOfStudy}
              onValueChange={(value) => setForm({ ...form, yearOfStudy: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year of study" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OF_STUDY_VALUES.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </FieldGroup>
    </FormSection>
  );
}

function LocationFields({
  form,
  setForm,
}: {
  form: SectionAForm;
  setForm: React.Dispatch<React.SetStateAction<SectionAForm>>;
}) {
  const { subCounties, isLoading: scLoading } = useSubCounties();
  const { wards, isLoading: wLoading } = useWards(undefined, form.subCountyId || null);
  const { villages, isLoading: vLoading } = useVillageUnits(form.wardId || null);

  return (
    <FieldGroup title="Residence">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm text-foreground/90">
          <span className="font-medium">Sub-County</span>
          <Select
            value={form.subCountyId}
            onValueChange={(value) => setForm((prev) => ({ ...prev, subCountyId: value, wardId: "", villageUnitId: "" }))}
            disabled={scLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sub-county" />
            </SelectTrigger>
            <SelectContent>
              {subCounties.map((sc) => (
                <SelectItem key={sc.id} value={sc.id}>
                  {sc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-sm text-foreground/90">
          <span className="font-medium">Ward</span>
          <Select
            value={form.wardId}
            onValueChange={(value) => setForm((prev) => ({ ...prev, wardId: value, villageUnitId: "" }))}
            disabled={wLoading || !form.subCountyId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ward" />
            </SelectTrigger>
            <SelectContent>
              {wards.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-sm text-foreground/90">
          <span className="font-medium">Village Unit</span>
          <Select
            value={form.villageUnitId}
            onValueChange={(value) => setForm((prev) => ({ ...prev, villageUnitId: value }))}
            disabled={vLoading || !form.wardId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select village unit" />
            </SelectTrigger>
            <SelectContent>
              {villages.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
    </FieldGroup>
  );
}
