"use client";

import * as React from "react";
import { type Row } from "@tanstack/react-table";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  buildSpreadsheetFilename,
  type SpreadsheetColumn,
  downloadXlsx,
} from "@/lib/csv-export";

export interface DataTableCsvExportButtonProps<TData> {
  selectedRows: Row<TData>[];
  columns: SpreadsheetColumn<TData>[];
  filenamePrefix: string;
  label?: string;
  itemNoun?: string;
  sheetName?: string;
  onExported?: () => void;
}

export function DataTableCsvExportButton<TData>({
  selectedRows,
  columns,
  filenamePrefix,
  label = "Export to Excel",
  itemNoun = "row",
  sheetName,
  onExported,
}: DataTableCsvExportButtonProps<TData>) {
  const [isPending, setIsPending] = React.useState(false);

  const handleExport = async () => {
    if (selectedRows.length === 0) {
      return;
    }

    setIsPending(true);
    try {
      const data = selectedRows.map((row) => row.original);
      const filename = buildSpreadsheetFilename(filenamePrefix, "xlsx");
      await downloadXlsx(data, columns, filename, { sheet: sheetName });
      const noun = selectedRows.length === 1 ? itemNoun : `${itemNoun}s`;
      toast.success("Export ready", {
        description: `Downloaded ${selectedRows.length} ${noun} as ${filename}.`,
      });
      onExported?.();
    } catch (reason: unknown) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Failed to export selected rows.";
      toast.error("Export failed", { description: message });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8"
      onClick={handleExport}
      disabled={isPending || selectedRows.length === 0}
    >
      {isPending ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}
