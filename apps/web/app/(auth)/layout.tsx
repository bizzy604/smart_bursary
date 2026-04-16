import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const civicHighlights = [
  "Mobile-first student journey",
  "County-branded official PDF forms",
  "AI-assisted review workflow",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <section className="county-pattern relative hidden overflow-hidden border-r border-brand-100 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/95 via-brand-700/90 to-accent-700/85" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <div className="space-y-5">
            <Badge variant="warning" className="w-fit border-accent-100 bg-accent-100/15 text-accent-100">
              County Education Fund
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-tight">
              Digital Bursary Delivery,
              <br />
              Built for Kenyan Counties
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-brand-50">
              KauntyBursary helps students apply quickly and gives county teams transparent, auditable,
              and data-backed decision support.
            </p>
          </div>

          <ul className="space-y-3 text-sm text-brand-50">
            {civicHighlights.map((highlight) => (
              <li key={highlight} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-accent-400" />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <Link href="/login" className="font-display text-xl font-bold text-brand-900">
              KauntyBursary
            </Link>
            <p className="text-sm text-gray-600">Secure access for students and county staff.</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
