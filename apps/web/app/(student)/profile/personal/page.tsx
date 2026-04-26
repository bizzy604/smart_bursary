"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudentProfile } from "@/hooks/use-student-profile";

export default function PersonalProfilePage() {
  const { profile, isLoading, error } = useStudentProfile();

  if (isLoading) {
    return (
      <section className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground shadow-xs">
        Loading profile...
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error ?? "Failed to load profile."}
      </section>
    );
  }

  return (
    <main className="space-y-5">
      <section className="rounded-xl border border-border bg-background p-6 shadow-xs">
        <h1 className="font-serif text-2xl font-bold text-primary">Personal Details</h1>
        <p className="mt-2 text-sm text-muted-foreground">These details are pre-filled into Section A of your application.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">Full Name</label>
            <Input value={profile.fullName} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">County</label>
            <Input value={profile.county} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">Ward</label>
            <Input value={profile.ward} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90">Phone</label>
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
