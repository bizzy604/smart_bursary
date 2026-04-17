import { StatsCard } from "@/components/shared/stats-card";
import { formatShortDate } from "@/lib/format";
import { countServiceStatus, platformServices } from "@/lib/ops-data";

function badge(status: "healthy" | "degraded" | "down"): string {
  if (status === "healthy") {
    return "border-success-100 bg-success-50 text-success-700";
  }

  if (status === "degraded") {
    return "border-warning-100 bg-warning-50 text-warning-700";
  }

  return "border-danger-100 bg-danger-50 text-danger-700";
}

export default function OpsHealthPage() {
  const healthy = countServiceStatus("healthy");
  const degraded = countServiceStatus("degraded");
  const down = countServiceStatus("down");

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">System Health Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Platform-wide service visibility across web, API, scoring workers, queues, and notifications.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Healthy Services" value={String(healthy)} hint="All checks green" />
        <StatsCard label="Degraded" value={String(degraded)} hint="Performance or latency risk" />
        <StatsCard label="Down" value={String(down)} hint="Requires incident response" />
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Service Status</h2>
        <div className="mt-4 space-y-3">
          {platformServices.map((service) => (
            <article key={service.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                <p className="mt-1 text-xs text-gray-500">Last update {formatShortDate(service.updatedAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-700">{service.latencyMs} ms</p>
                <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase ${badge(service.status)}`}>
                  {service.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Incident Feed</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li className="rounded-lg border border-warning-100 bg-warning-50 p-3">
            AI scoring latency spiked above 900 ms in the last 15 minutes. Auto-scaling policy increased worker replicas.
          </li>
          <li className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            No failed queue processors detected in the last 24 hours.
          </li>
        </ul>
      </section>
    </main>
  );
}
