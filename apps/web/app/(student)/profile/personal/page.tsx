"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudentProfile } from "@/hooks/use-student-profile";

export default function PersonalProfilePage() {
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
        <h1 className="font-display text-2xl font-bold text-brand-900">Personal Details</h1>
        <p className="mt-2 text-sm text-gray-600">These details are pre-filled into Section A of your application.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <Input value={profile.fullName} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">County</label>
            <Input value={profile.county} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ward</label>
            <Input value={profile.ward} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <Input value={profile.phone} readOnly />
          </div>
        </div>
      </section>

      <Link href="/profile">
        <Button variant="outline">Back to Profile</Button>
      </Link>
    </main>
  );
}
