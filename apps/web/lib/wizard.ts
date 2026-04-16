import type { Route } from "next";
import type { SectionSlug } from "@/store/application-wizard-store";

export interface WizardStep {
  key: SectionSlug | "preview";
  label: string;
  href: Route;
}

export function getWizardSteps(programId: string): WizardStep[] {
  return [
    { key: "section-a", label: "Personal", href: `/apply/${programId}/section-a` as Route },
    { key: "section-b", label: "Amounts", href: `/apply/${programId}/section-b` as Route },
    { key: "section-c", label: "Family", href: `/apply/${programId}/section-c` as Route },
    { key: "section-d", label: "Financial", href: `/apply/${programId}/section-d` as Route },
    { key: "section-e", label: "Disclosures", href: `/apply/${programId}/section-e` as Route },
    { key: "section-f", label: "Documents", href: `/apply/${programId}/section-f` as Route },
    { key: "preview", label: "Preview", href: `/apply/${programId}/preview` as Route },
  ];
}
