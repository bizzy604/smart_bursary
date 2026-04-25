import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardChartCardProps {
  eyebrow?: string;
  title: string;
  description: string;
  aside?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function DashboardChartCard({
  eyebrow,
  title,
  description,
  aside,
  className,
  contentClassName,
  children,
}: DashboardChartCardProps) {
  return (
    <Card
      className={cn(
        "border-brand-100/80 bg-white/95 shadow-xs backdrop-blur",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-county-primary">
              {eyebrow}
            </p>
          ) : null}
          <CardTitle className="font-display text-lg text-brand-900">
            {title}
          </CardTitle>
          <CardDescription className="max-w-xl text-sm text-gray-600">
            {description}
          </CardDescription>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </CardHeader>
      <CardContent className={cn("space-y-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
