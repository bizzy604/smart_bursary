import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileSnapshot } from "@/lib/student-data";

export default function PersonalProfilePage() {
  return (
    <main className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h1 className="font-display text-2xl font-bold text-brand-900">Personal Details</h1>
        <p className="mt-2 text-sm text-gray-600">These details are pre-filled into Section A of your application.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <Input value={profileSnapshot.fullName} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">County</label>
            <Input value={profileSnapshot.county} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ward</label>
            <Input value={profileSnapshot.ward} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <Input value={profileSnapshot.phone} readOnly />
          </div>
        </div>
      </section>

      <Link href="/profile">
        <Button variant="outline">Back to Profile</Button>
      </Link>
    </main>
  );
}
