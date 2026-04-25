"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useStudentProfile } from "@/hooks/use-student-profile";

export default function ProfileOverviewPage() {
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
    <main className="space-y-6">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs">
        <h1 className="font-display text-2xl font-bold text-brand-900">Profile Overview</h1>
        <p className="mt-2 text-sm text-gray-600">
          Keep your profile details accurate to improve eligibility checks and speed up review.
        </p>

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Full Name</dt>
            <dd className="mt-1 font-medium text-gray-800">{profile.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Email</dt>
            <dd className="mt-1 font-medium text-gray-800">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Phone</dt>
            <dd className="mt-1 font-medium text-gray-800">{profile.phone}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Institution</dt>
            <dd className="mt-1 font-medium text-gray-800">{profile.institution}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Course</dt>
            <dd className="mt-1 font-medium text-gray-800">{profile.course}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Ward</dt>
            <dd className="mt-1 font-medium text-gray-800">{profile.ward}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/profile/personal">
          <Button fullWidth variant="outline">
            Personal Details
          </Button>
        </Link>
        <Link href="/profile/academic">
          <Button fullWidth variant="outline">
            Academic Details
          </Button>
        </Link>
        <Link href="/profile/family">
          <Button fullWidth variant="outline">
            Family Details
          </Button>
        </Link>
      </section>
    </main>
  );
}
