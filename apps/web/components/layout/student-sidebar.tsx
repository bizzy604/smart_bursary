"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCounty } from "@/hooks/use-county";
import { studentNavigationItems } from "@/lib/student-navigation";
import { cn } from "@/lib/utils";

export function StudentSidebar() {
  const pathname = usePathname();
  const { county } = useCounty();

  return (
    <aside className="hidden md:block">
      <div className="sticky top-[76px] rounded-b-2xl border border-t-0 border-brand-100 bg-white/90 p-4 shadow-xs backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-county-primary">Student Navigation</p>
        <h2 className="mt-1 font-display text-lg font-semibold text-brand-900">{county.fundName}</h2>

        <nav className="mt-4">
          <ul className="space-y-1">
            {studentNavigationItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border-county-primary/30 bg-county-primary/10 text-county-primary"
                        : "border-transparent text-gray-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-900",
                    )}
                  >
                    <span className={cn("mr-2 h-2 w-2 rounded-full", isActive ? "bg-accent-500" : "bg-gray-300")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
