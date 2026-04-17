"use client";

import { Button } from "@/components/ui/button";
import { downloadTextFile, openPreviewHtml } from "@/lib/client-download";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import { buildWardReportCsv, reportMeta, wardReportRows, wardReportTotals } from "@/lib/reporting-data";

function buildWardReportHtml(): string {
  const totals = wardReportTotals();

  const bodyRows = wardReportRows
    .map((row) => {
      return `<tr>
        <td>${row.ward}</td>
        <td>${row.applications}</td>
        <td>${row.approved}</td>
        <td>${row.rejected}</td>
        <td>${formatCurrencyKes(row.allocatedKes)}</td>
        <td>${formatCurrencyKes(row.disbursedKes)}</td>
      </tr>`;
    })
    .join("");

  return `
    <style>
      body { font-family: 'Noto Sans', Arial, sans-serif; padding: 24px; color: #111827; }
      h1 { margin: 0; color: #0d2b4e; }
      p { margin: 6px 0 0; color: #4b5563; }
      table { margin-top: 16px; width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 13px; }
      th { background: #eff6fc; color: #1e3a5f; }
      tfoot td { font-weight: 700; background: #f9fafb; }
    </style>
    <h1>Ward Summary Report</h1>
    <p>Program: ${reportMeta.programName}</p>
    <p>Academic Year: ${reportMeta.academicYear} • Generated ${formatShortDate(reportMeta.generatedAt)}</p>
    <table>
      <thead>
        <tr>
          <th>Ward</th>
          <th>Applications</th>
          <th>Approved</th>
          <th>Rejected</th>
          <th>Allocated</th>
          <th>Disbursed</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td>${totals.applications}</td>
          <td>${totals.approved}</td>
          <td>${totals.rejected}</td>
          <td>${formatCurrencyKes(totals.allocatedKes)}</td>
          <td>${formatCurrencyKes(totals.disbursedKes)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

export default function WardReportsPage() {
  const totals = wardReportTotals();

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Ward Report Export</h1>
        <p className="mt-1 text-sm text-gray-600">
          Export ward-level summary reports including AI-informed review outcomes and allocation performance.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="grid gap-3 md:grid-cols-4">
          <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>{reportMeta.programName}</option>
          </select>
          <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>{reportMeta.academicYear}</option>
          </select>
          <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>All Wards</option>
          </select>
          <p className="flex items-center text-sm text-gray-600">Generated {formatShortDate(reportMeta.generatedAt)}</p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2">Ward</th>
                <th className="px-2 py-2">Applications</th>
                <th className="px-2 py-2">Approved</th>
                <th className="px-2 py-2">Rejected</th>
                <th className="px-2 py-2">Allocated</th>
                <th className="px-2 py-2">Disbursed</th>
              </tr>
            </thead>
            <tbody>
              {wardReportRows.map((row) => (
                <tr key={row.ward} className="border-b border-gray-100">
                  <td className="px-2 py-2 font-medium text-brand-900">{row.ward}</td>
                  <td className="px-2 py-2 text-gray-700">{row.applications}</td>
                  <td className="px-2 py-2 text-gray-700">{row.approved}</td>
                  <td className="px-2 py-2 text-gray-700">{row.rejected}</td>
                  <td className="px-2 py-2 text-gray-700">{formatCurrencyKes(row.allocatedKes)}</td>
                  <td className="px-2 py-2 text-gray-700">{formatCurrencyKes(row.disbursedKes)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 text-gray-900">
                <td className="px-2 py-2 font-semibold">Total</td>
                <td className="px-2 py-2 font-semibold">{totals.applications}</td>
                <td className="px-2 py-2 font-semibold">{totals.approved}</td>
                <td className="px-2 py-2 font-semibold">{totals.rejected}</td>
                <td className="px-2 py-2 font-semibold">{formatCurrencyKes(totals.allocatedKes)}</td>
                <td className="px-2 py-2 font-semibold">{formatCurrencyKes(totals.disbursedKes)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              downloadTextFile("ward-report.csv", buildWardReportCsv(), "text/csv;charset=utf-8");
            }}
          >
            Download Excel (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              openPreviewHtml("Ward Report", buildWardReportHtml());
            }}
          >
            Download PDF Summary
          </Button>
        </div>
      </section>
    </main>
  );
}
