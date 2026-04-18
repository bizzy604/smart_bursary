"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyKes } from "@/lib/format";
import { useStudentProfile } from "@/hooks/use-student-profile";

export default function FamilyProfilePage() {
  const { profile, isLoading, error } = useStudentProfile();

  if (isLoading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-xs">
        Loading profile...
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section className="rounded-xl border border-danger-200 bg-danger-50 p-6 text-sm text-danger-700">
        {error ?? "Failed to load profile."}
      </section>
    );
  }

  return (
    <main className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h1 className="font-display text-2xl font-bold text-brand-900">Family and Financial Details</h1>
        <p className="mt-2 text-sm text-gray-600">
          This information supports fair scoring and committee review decisions.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Family Status</label>
            <Input value={profile.familyStatus} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Siblings in School</label>
            <Input value={String(profile.siblingsInSchool)} readOnly />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Guardian Annual Income</label>
            <Input value={formatCurrencyKes(profile.guardianIncomeKes)} readOnly />
          </div>
        </div>
      </section>

      <Link href="/profile">
        <Button variant="outline">Back to Profile</Button>
      </Link>
    </main>
  );
}
