import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyKes } from "@/lib/format";
import { profileSnapshot } from "@/lib/student-data";

export default function FamilyProfilePage() {
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
            <Input value={profileSnapshot.familyStatus} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Siblings in School</label>
            <Input value={String(profileSnapshot.siblingsInSchool)} readOnly />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Guardian Annual Income</label>
            <Input value={formatCurrencyKes(profileSnapshot.guardianIncomeKes)} readOnly />
          </div>
        </div>
      </section>

      <Link href="/profile">
        <Button variant="outline">Back to Profile</Button>
      </Link>
    </main>
  );
}
