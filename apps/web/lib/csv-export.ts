"use client";

import writeXlsxFile, { type CellObject, type SheetData } from "write-excel-file/browser";

export type SpreadsheetColumnType =
  | "string"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "boolean";

export interface SpreadsheetColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | Date | null | undefined;
  type?: SpreadsheetColumnType;
  /** Excel column width in characters. Defaults to 18. */
  width?: number;
  /** Override the Excel cell format string (e.g. "#,##0.00", "yyyy-mm-dd"). */
  format?: string;
}

/** @deprecated Renamed to {@link SpreadsheetColumn}. Kept for backwards compatibility. */
export type CsvColumn<T> = SpreadsheetColumn<T>;

const HEADER_BACKGROUND = "#f3f4f6";
const HEADER_BORDER = "#d1d5db";

function alignForType(
  type: SpreadsheetColumnType | undefined,
): "left" | "center" | "right" {
  switch (type) {
    case "number":
    case "currency":
    case "percent":
      return "right";
    case "date":
    case "boolean":
      return "center";
    default:
      return "left";
  }
}

function defaultFormatForType(
  type: SpreadsheetColumnType | undefined,
): string | undefined {
  switch (type) {
    case "number":
    case "currency":
      return "#,##0";
    case "percent":
      return "0%";
    case "date":
      return "yyyy-mm-dd";
    default:
      return undefined;
  }
}

function buildHeaderRow<T>(columns: SpreadsheetColumn<T>[]): CellObject[] {
  return columns.map((col): CellObject => ({
    type: String,
    value: col.header,
    fontWeight: "bold",
    backgroundColor: HEADER_BACKGROUND,
    borderColor: HEADER_BORDER,
    borderStyle: "thin",
    align: alignForType(col.type),
    wrap: true,
  }));
}

function buildDataCell<T>(
  col: SpreadsheetColumn<T>,
  raw: string | number | boolean | Date | null | undefined,
): CellObject {
  if (raw === null || raw === undefined || raw === "") {
    return { value: undefined };
  }

  const type = col.type ?? "string";
  const align = alignForType(type);
  const format = col.format ?? defaultFormatForType(type);

  switch (type) {
    case "number":
    case "currency": {
      const numeric = typeof raw === "number" ? raw : Number(raw);
      if (Number.isNaN(numeric)) {
        return { type: String, value: String(raw), align };
      }
      return { type: Number, value: numeric, format, align };
    }
    case "percent": {
      const numeric = typeof raw === "number" ? raw : Number(raw);
      if (Number.isNaN(numeric)) {
        return { type: String, value: String(raw), align };
      }
      // Convention: input is on a 0-100 scale; convert to fraction for "0%" format.
      return { type: Number, value: numeric / 100, format, align };
    }
    case "date": {
      const date = raw instanceof Date ? raw : new Date(String(raw));
      if (Number.isNaN(date.getTime())) {
        return { type: String, value: String(raw), align };
      }
      return { type: Date, value: date, format, align };
    }
    case "boolean":
      return { type: Boolean, value: Boolean(raw), align };
    case "string":
    default:
      return { type: String, value: String(raw), align };
  }
}

export interface DownloadSpreadsheetOptions {
  sheet?: string;
}

export async function downloadXlsx<T>(
  rows: T[],
  columns: SpreadsheetColumn<T>[],
  filename: string,
  options: DownloadSpreadsheetOptions = {},
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const sheetData: SheetData = [
    buildHeaderRow(columns),
    ...rows.map((row): CellObject[] =>
      columns.map((col) => buildDataCell(col, col.value(row))),
    ),
  ];

  const sheetOptions = {
    sheet: options.sheet ?? "Data",
    columns: columns.map((col) => ({ width: col.width ?? 18 })),
    stickyRowsCount: 1,
  } as const;

  const safeName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  await writeXlsxFile(sheetData, sheetOptions).toFile(safeName);
}

/** @deprecated Renamed to {@link downloadXlsx}. Now produces a styled .xlsx file. */
export const downloadCsv = downloadXlsx;

export function formatCsvDate(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

export function buildSpreadsheetFilename(
  prefix: string,
  extension: "xlsx" | "csv" = "xlsx",
): string {
  const datePart = new Date().toISOString().slice(0, 10);
  const safePrefix = prefix
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const fallback = safePrefix.length > 0 ? safePrefix : "export";
  return `${fallback}-${datePart}.${extension}`;
}

/** @deprecated Use {@link buildSpreadsheetFilename}. Returns an .xlsx filename now. */
export function buildCsvFilename(prefix: string): string {
  return buildSpreadsheetFilename(prefix, "xlsx");
}

/**
 * Build a raw CSV string from rows. Kept for niche cases (data interchange,
 * piping into other tools) where formatting is not required.
 */
export function rowsToCsv<T>(
  rows: T[],
  columns: SpreadsheetColumn<T>[],
): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = typeof value === "string" ? value : String(value);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => escape(c.value(row))).join(","),
  );
  return [header, ...body].join("\r\n");
}
