"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FieldGroup } from "@/components/forms/field-group";
import { FormSection } from "@/components/forms/form-section";
import { IncomeGrid, type IncomeGridValue } from "@/components/forms/income-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useApplicationWizardStore } from "@/store/application-wizard-store";

interface SectionDForm {
  income: IncomeGridValue;
  rentOrBoardingKes: string;
  medicalSupportKes: string;
  supportFromWellWishersKes: string;
  hardshipNarrative: string;
}

const defaultIncome: IncomeGridValue = {
  fatherOccupation: "",
  fatherMonthlyIncomeKes: "",
  motherOccupation: "",
  motherMonthlyIncomeKes: "",
  guardianOccupation: "",
  guardianMonthlyIncomeKes: "",
  additionalIncomeSource: "",
  additionalIncomeKes: "",
};

const defaultForm: SectionDForm = {
  income: defaultIncome,
  rentOrBoardingKes: "",
  medicalSupportKes: "",
  supportFromWellWishersKes: "",
  hardshipNarrative: "",
};

export default function ApplySectionDPage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
  const setSectionData = useApplicationWizardStore((state) => state.setSectionData);
  const setSectionComplete = useApplicationWizardStore((state) => state.setSectionComplete);
  const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
  const didHydrate = useRef(false);
  const [form, setForm] = useState<SectionDForm>(defaultForm);

  useEffect(() => {
    hydrateProgram(params.programId);
  }, [hydrateProgram, params.programId]);

  useEffect(() => {
    if (!programState || didHydrate.current) {
      return;
    }

    const stored = programState.sectionData["section-d"] as Partial<SectionDForm>;
    setForm({
      ...defaultForm,
      ...stored,
      income: {
        ...defaultIncome,
        ...(stored.income ?? {}),
      },
    });
    didHydrate.current = true;
  }, [programState]);

  const isUnlocked = Boolean(programState?.completion["section-c"]);
  const hasIncomeEntry =
    Number(form.income.fatherMonthlyIncomeKes || 0) > 0 ||
    Number(form.income.motherMonthlyIncomeKes || 0) > 0 ||
    Number(form.income.guardianMonthlyIncomeKes || 0) > 0 ||
    Number(form.income.additionalIncomeKes || 0) > 0;
  const isValid = hasIncomeEntry && form.hardshipNarrative.trim().length >= 30;

  useEffect(() => {
    setSectionComplete(params.programId, "section-d", isValid);
  }, [isValid, params.programId, setSectionComplete]);

  const saveDraft = useCallback(
    (value: SectionDForm) => {
      setSectionData(params.programId, "section-d", value);
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
        <h2 className="font-display text-xl font-semibold text-warning-700">Complete Section C First</h2>
        <p className="mt-2 text-sm text-warning-700">Section D unlocks after family details are captured.</p>
        <div className="mt-4">
          <Link href={`/apply/${params.programId}/section-c`}>
            <Button>Go to Section C</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FormSection
      title="Section D: Financial Information"
      description="Provide household income and recurring pressure points to support accurate means scoring."
      backHref={`/apply/${params.programId}/section-c` as Route}
      saveStatus={saveStatus}
      isNextDisabled={!isValid}
      onNext={() => {
        if (!isValid) {
          return;
        }

        setSectionData(params.programId, "section-d", form);
        setSectionComplete(params.programId, "section-d", true);
        router.push(`/apply/${params.programId}/section-e` as Route);
      }}
    >
      <FieldGroup title="Household Income Sources">
        <IncomeGrid value={form.income} onChange={(income) => setForm({ ...form, income })} />
      </FieldGroup>

      <FieldGroup title="Cost Pressures">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Rent / Boarding (KES)</span>
            <Input
              type="number"
              value={form.rentOrBoardingKes}
              onChange={(event) => setForm({ ...form, rentOrBoardingKes: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Medical Support (KES)</span>
            <Input
              type="number"
              value={form.medicalSupportKes}
              onChange={(event) => setForm({ ...form, medicalSupportKes: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Well-Wisher Support (KES)</span>
            <Input
              type="number"
              value={form.supportFromWellWishersKes}
              onChange={(event) => setForm({ ...form, supportFromWellWishersKes: event.target.value })}
            />
          </label>
        </div>
      </FieldGroup>

      <FieldGroup title="Financial Hardship Narrative" description="Minimum 30 characters.">
        <textarea
          value={form.hardshipNarrative}
          onChange={(event) => setForm({ ...form, hardshipNarrative: event.target.value })}
          className="min-h-[150px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs transition-colors placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
          placeholder="Describe your current hardship and why bursary support is critical this term."
        />
      </FieldGroup>
    </FormSection>
  );
}
