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

interface SectionBForm {
  requestedKes: string;
  feeBalanceKes: string;
  totalFeeKes: string;
  sponsorSupportKes: string;
  helbApplied: boolean;
  helbAmountKes: string;
  priorBursaryReceived: boolean;
  priorBursarySource: string;
  priorBursaryAmountKes: string;
  reasonForSupport: string;
}

const defaultForm: SectionBForm = {
  requestedKes: "",
  feeBalanceKes: "",
  totalFeeKes: "",
  sponsorSupportKes: "",
  helbApplied: false,
  helbAmountKes: "",
  priorBursaryReceived: false,
  priorBursarySource: "",
  priorBursaryAmountKes: "",
  reasonForSupport: "",
};

export default function ApplySectionBPage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
  const setSectionData = useApplicationWizardStore((state) => state.setSectionData);
  const setSectionComplete = useApplicationWizardStore((state) => state.setSectionComplete);
  const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
  const didHydrate = useRef(false);
  const [form, setForm] = useState<SectionBForm>(defaultForm);

  useEffect(() => {
    hydrateProgram(params.programId);
  }, [hydrateProgram, params.programId]);

  useEffect(() => {
    if (!programState || didHydrate.current) {
      return;
    }

    const stored = programState.sectionData["section-b"] as Partial<SectionBForm>;
    setForm({ ...defaultForm, ...stored });
    didHydrate.current = true;
  }, [programState]);

  const isUnlocked = Boolean(programState?.completion["section-a"]);
  const requested = Number(form.requestedKes || 0);
  const balance = Number(form.feeBalanceKes || 0);
  const reasonReady = form.reasonForSupport.trim().length >= 20;
  const helbValid = !form.helbApplied || Number(form.helbAmountKes || 0) > 0;
  const priorBursaryValid =
    !form.priorBursaryReceived ||
    (form.priorBursarySource.trim().length > 2 && Number(form.priorBursaryAmountKes || 0) > 0);
  const isValid = requested > 0 && balance > 0 && reasonReady && helbValid && priorBursaryValid;

  useEffect(() => {
    setSectionComplete(params.programId, "section-b", isValid);
  }, [isValid, params.programId, setSectionComplete]);

  const saveDraft = useCallback(
    (value: SectionBForm) => {
      setSectionData(params.programId, "section-b", value);
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
        <h2 className="font-display text-xl font-semibold text-warning-700">Complete Section A First</h2>
        <p className="mt-2 text-sm text-warning-700">You need to complete personal details before requesting support amounts.</p>
        <div className="mt-4">
          <Link href={`/apply/${params.programId}/section-a`}>
            <Button>Go to Section A</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FormSection
      title="Section B: Bursary Amount Request"
      description="Capture the exact fee position and explain why this bursary support is necessary now."
      backHref={`/apply/${params.programId}/section-a` as Route}
      saveStatus={saveStatus}
      isNextDisabled={!isValid}
      onNext={() => {
        if (!isValid) {
          return;
        }

        setSectionData(params.programId, "section-b", form);
        setSectionComplete(params.programId, "section-b", true);
        router.push(`/apply/${params.programId}/section-c` as Route);
      }}
    >
      <FieldGroup title="Fee Breakdown">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Requested Amount (KES)</span>
            <Input
              type="number"
              value={form.requestedKes}
              onChange={(event) => setForm({ ...form, requestedKes: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Current Fee Balance (KES)</span>
            <Input
              type="number"
              value={form.feeBalanceKes}
              onChange={(event) => setForm({ ...form, feeBalanceKes: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Total Annual Fee (KES)</span>
            <Input
              type="number"
              value={form.totalFeeKes}
              onChange={(event) => setForm({ ...form, totalFeeKes: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span className="font-medium">Support from Other Sponsors (KES)</span>
            <Input
              type="number"
              value={form.sponsorSupportKes}
              onChange={(event) => setForm({ ...form, sponsorSupportKes: event.target.value })}
            />
          </label>
        </div>
      </FieldGroup>

      <FieldGroup title="Need Statement" description="Minimum 20 characters.">
        <textarea
          value={form.reasonForSupport}
          onChange={(event) => setForm({ ...form, reasonForSupport: event.target.value })}
          className="min-h-[140px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-xs transition-colors placeholder:text-gray-400 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
          placeholder="Describe your current financial challenge and how this bursary will support your studies."
        />
      </FieldGroup>

      <FieldGroup title="Funding Disclosures">
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.helbApplied}
              onChange={(event) => setForm({ ...form, helbApplied: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span>I have applied for HELB support for this intake period.</span>
          </label>

          {form.helbApplied ? (
            <label className="space-y-1 text-sm text-gray-700 md:max-w-sm">
              <span className="font-medium">HELB Amount (KES)</span>
              <Input
                type="number"
                value={form.helbAmountKes}
                onChange={(event) => setForm({ ...form, helbAmountKes: event.target.value })}
              />
            </label>
          ) : null}

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.priorBursaryReceived}
              onChange={(event) => setForm({ ...form, priorBursaryReceived: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span>I have previously received bursary support.</span>
          </label>

          {form.priorBursaryReceived ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm text-gray-700 md:col-span-2">
                <span className="font-medium">Prior Bursary Source</span>
                <Input
                  value={form.priorBursarySource}
                  onChange={(event) => setForm({ ...form, priorBursarySource: event.target.value })}
                  placeholder="e.g. County Needy Students Fund"
                />
              </label>
              <label className="space-y-1 text-sm text-gray-700 md:max-w-sm">
                <span className="font-medium">Prior Bursary Amount (KES)</span>
                <Input
                  type="number"
                  value={form.priorBursaryAmountKes}
                  onChange={(event) => setForm({ ...form, priorBursaryAmountKes: event.target.value })}
                />
              </label>
            </div>
          ) : null}
        </div>
      </FieldGroup>
    </FormSection>
  );
}
