import { formatShortDate } from "@/lib/format";

export interface PreviewEntry {
  label: string;
  value: string;
}

export interface PreviewSection {
  slug: string;
  title: string;
  entries: PreviewEntry[];
}

const sectionTitles: Record<string, string> = {
  "section-a": "A. Student Personal Details",
  "section-b": "B. Amounts Applied",
  "section-c": "C. Family Details",
  "section-d": "D. Financial Status",
  "section-e": "E. Other Disclosures",
  "section-f": "F. Supporting Documents",
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? value : "-";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-";
    }

    if (typeof value[0] === "object" && value[0] !== null) {
      return value
        .map((item, index) => {
          const parts = Object.entries(item as Record<string, unknown>)
            .filter(([, childValue]) => childValue !== null && childValue !== undefined && `${childValue}`.trim() !== "")
            .map(([childKey, childValue]) => `${toLabel(childKey)}: ${valueToText(childValue)}`);
          return `${index + 1}) ${parts.join(", ")}`;
        })
        .join(" | ");
    }

    return value.map((item) => valueToText(item)).join(", ");
  }

  if (typeof value === "object") {
    const rows = Object.entries(value as Record<string, unknown>)
      .filter(([, childValue]) => childValue !== null && childValue !== undefined)
      .map(([childKey, childValue]) => `${toLabel(childKey)}: ${valueToText(childValue)}`);

    return rows.length > 0 ? rows.join(" | ") : "-";
  }

  return "-";
}

export function toPreviewSections(sectionData: Record<string, unknown>): PreviewSection[] {
  return Object.entries(sectionData)
    .filter(([slug]) => slug in sectionTitles)
    .map(([slug, data]) => {
      const objectData = (data ?? {}) as Record<string, unknown>;
      const entries = Object.entries(objectData).map(([key, value]) => ({
        label: toLabel(key),
        value: valueToText(value),
      }));

      return {
        slug,
        title: sectionTitles[slug],
        entries,
      } satisfies PreviewSection;
    });
}

export function buildApplicationPreviewHtml(params: {
  countyName: string;
  fundName: string;
  programName: string;
  reference: string;
  generatedAt: string;
  sections: PreviewSection[];
}): string {
  const sectionHtml = params.sections
    .map((section) => {
      const rows = section.entries
        .map(
          (entry) => `
            <tr>
              <td class="label">${escapeHtml(entry.label)}</td>
              <td class="value">${escapeHtml(entry.value)}</td>
            </tr>`,
        )
        .join("");

      return `
        <section class="section-block">
          <h2>${escapeHtml(section.title)}</h2>
          <table>
            <tbody>${rows || "<tr><td class=\"value\" colspan=\"2\">No data captured</td></tr>"}</tbody>
          </table>
        </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(params.reference)} - Application Preview</title>
    <style>
      body {
        font-family: "Noto Sans", Arial, sans-serif;
        margin: 0;
        color: #1a1a1a;
        background: #ffffff;
      }
      .page {
        width: min(920px, 100% - 32px);
        margin: 20px auto;
      }
      .header {
        border: 2px solid #0d2b4e;
        padding: 14px;
        border-radius: 10px;
      }
      .header h1 {
        margin: 6px 0 0;
        font-size: 20px;
        color: #0d2b4e;
      }
      .meta {
        margin-top: 8px;
        font-size: 12px;
        color: #555;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .section-block {
        margin-top: 14px;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        overflow: hidden;
      }
      .section-block h2 {
        margin: 0;
        padding: 10px 12px;
        font-size: 14px;
        color: #0d2b4e;
        background: #eff6fc;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      td {
        border-top: 1px solid #e5e7eb;
        vertical-align: top;
        padding: 9px 12px;
        font-size: 12px;
      }
      .label {
        width: 220px;
        font-weight: 600;
        color: #374151;
        background: #f9fafb;
      }
      .value {
        color: #111827;
      }
      .footer {
        margin-top: 16px;
        font-size: 11px;
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <header class="header">
        <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#1e3a5f;">County Government Bursary Form</p>
        <h1>${escapeHtml(params.countyName)} - ${escapeHtml(params.fundName)}</h1>
        <div class="meta">
          <span>Program: ${escapeHtml(params.programName)}</span>
          <span>Reference: ${escapeHtml(params.reference)}</span>
          <span>Generated: ${escapeHtml(formatShortDate(params.generatedAt))}</span>
        </div>
      </header>

      ${sectionHtml}

      <p class="footer">Generated by KauntyBursary student portal. Keep this copy for your records.</p>
    </div>
  </body>
</html>`;
}
