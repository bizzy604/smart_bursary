"use client";

import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FieldGroup } from "@/components/forms/field-group";
import { FormSection } from "@/components/forms/form-section";
import { Input } from "@/components/ui/input";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useApplicationWizardStore } from "@/store/application-wizard-store";

interface SectionAForm {
  fullName: string;
  nationalIdOrBirthCert: string;
  phone: string;
  email: string;
  institution: string;
  admissionNumber: string;
  course: string;
  yearOfStudy: string;
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
};

export default function ApplySectionAPage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
  const setSectionData = useApplicationWizardStore((state) => state.setSectionData);
  const setSectionComplete = useApplicationWizardStore((state) => state.setSectionComplete);
  const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
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
    setForm({ ...defaultForm, ...stored });
    didHydrate.current = true;
  }, [programState]);

  const isValid =
    form.fullName.trim().length > 2 &&
    form.phone.trim().length >= 10 &&
    form.email.includes("@") &&
    form.institution.trim().length > 2 &&
    form.admissionNumber.trim().length > 1 &&
    form.course.trim().length > 1;

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
    return <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading section...</section>;
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
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Full Name</span>
            <Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">National ID / Birth Cert No.</span>
            <Input
              value={form.nationalIdOrBirthCert}
              onChange={(event) => setForm({ ...form, nationalIdOrBirthCert: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Phone Number</span>
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Email Address</span>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
        </div>
      </FieldGroup>

      <FieldGroup title="Academic Profile">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-gray-700 md:col-span-2">
            <span className="font-medium">Institution</span>
            <Input value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Admission Number</span>
            <Input
              value={form.admissionNumber}
              onChange={(event) => setForm({ ...form, admissionNumber: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Course / Class</span>
            <Input value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Year of Study</span>
            <Input
              value={form.yearOfStudy}
              onChange={(event) => setForm({ ...form, yearOfStudy: event.target.value })}
              placeholder="e.g. Year 2"
            />
          </label>
        </div>
      </FieldGroup>
    </FormSection>
  );
}
