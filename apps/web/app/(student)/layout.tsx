import type { ReactNode } from "react";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { StudentBottomNav } from "@/components/layout/student-bottom-nav";
import { StudentHeader } from "@/components/layout/student-header";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <CountyBrandingProvider>
      <div className="page-shell bg-transparent pb-20 md:pb-8">
        <StudentHeader />
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        <StudentBottomNav />
      </div>
    </CountyBrandingProvider>
  );
}