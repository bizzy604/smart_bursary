import type { ReactNode } from "react";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { StudentBottomNav } from "@/components/layout/student-bottom-nav";
import { StudentHeader } from "@/components/layout/student-header";
import { StudentSidebar } from "@/components/layout/student-sidebar";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <CountyBrandingProvider>
      <div className="page-shell bg-transparent pb-20 md:pb-8">
        <StudentHeader />
        <div className="w-full px-4 pb-6 pt-0 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
            <StudentSidebar />
            <div className="min-w-0">{children}</div>
          </div>
        </div>
        <StudentBottomNav />
      </div>
    </CountyBrandingProvider>
  );
}