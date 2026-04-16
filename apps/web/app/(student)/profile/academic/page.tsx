import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileSnapshot } from "@/lib/student-data";

export default function AcademicProfilePage() {
  return (
    <main className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h1 className="font-display text-2xl font-bold text-brand-900">Academic Details</h1>
        <p className="mt-2 text-sm text-gray-600">
          These details guide eligibility checks for county bursary programs.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Institution</label>
            <Input value={profileSnapshot.institution} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Course</label>
            <Input value={profileSnapshot.course} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Year of Study</label>
            <Input value={profileSnapshot.yearOfStudy} readOnly />
          </div>
        </div>
      </section>

      <Link href="/profile">
        <Button variant="outline">Back to Profile</Button>
      </Link>
    </main>
  );
}
