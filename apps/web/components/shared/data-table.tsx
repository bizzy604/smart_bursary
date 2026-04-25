"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table as TanStackTable,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";
import {
  DataTableToolbar,
  type FacetedFilterConfig,
} from "./data-table-toolbar";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  error?: string | null;
  searchColumnId?: string;
  searchPlaceholder?: string;
  facetedFilters?: FacetedFilterConfig[];
  toolbar?: React.ReactNode;
  toolbarLeading?: React.ReactNode;
  renderSelectedActions?: (
    props: DataTableSelectedActionsProps<TData>,
  ) => React.ReactNode;
  emptyState?: React.ReactNode;
  initialPageSize?: number;
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  enableRowSelection?: boolean;
  enablePagination?: boolean;
  enableToolbar?: boolean;
  getRowId?: (row: TData, index: number) => string;
  onRowClick?: (row: TData) => void;
  onTableReady?: (table: TanStackTable<TData>) => void;
  className?: string;
}

export interface DataTableSelectedActionsProps<TData> {
  table: TanStackTable<TData>;
  selectedRows: Row<TData>[];
  selectedCount: number;
  clearSelection: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  error = null,
  searchColumnId,
  searchPlaceholder,
  facetedFilters,
  toolbar,
  toolbarLeading,
  renderSelectedActions,
  emptyState,
  initialPageSize = 10,
  initialSorting = [],
  initialColumnVisibility = {},
  enableRowSelection = true,
  enablePagination = true,
  enableToolbar = true,
  getRowId,
  onRowClick,
  onTableReady,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const canSelectRows = enableRowSelection ?? Boolean(renderSelectedActions);

  const resolvedColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!canSelectRows) {
      return columns;
    }

    const selectionColumn: ColumnDef<TData, TValue> = {
      id: "select",
      header: ({ table }) => (
        <div
          className="flex items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(Boolean(value))
            }
            aria-label="Select all rows"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="flex items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            disabled={!row.getCanSelect()}
            aria-label={`Select row ${row.id}`}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectionColumn, ...columns];
  }, [canSelectRows, columns]);

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    getRowId,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    enableRowSelection: canSelectRows,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    initialState: enablePagination
      ? { pagination: { pageSize: initialPageSize } }
      : undefined,
  });

  React.useEffect(() => {
    onTableReady?.(table);
  }, [table, onTableReady]);

  const rows = table.getRowModel().rows;
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedActions =
    selectedCount > 0 && renderSelectedActions
      ? renderSelectedActions({
          table,
          selectedRows,
          selectedCount,
          clearSelection: () => table.resetRowSelection(),
        })
      : null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {enableToolbar ? (
        <DataTableToolbar
          table={table}
          searchColumnId={searchColumnId}
          searchPlaceholder={searchPlaceholder}
          facetedFilters={facetedFilters}
          renderFacetedFilter={(config) => (
            <DataTableFacetedFilter
              column={table.getColumn(config.columnId)}
              title={config.title}
              options={config.options}
            />
          )}
          selectedCount={selectedCount}
          selectedActions={selectedActions}
          onClearSelection={
            selectedCount > 0 ? () => table.resetRowSelection() : undefined
          }
        >
          {toolbarLeading}
          {toolbar}
        </DataTableToolbar>
      ) : null}

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(initialPageSize, 5) }).map(
                (_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {table.getAllLeafColumns().map((column) => (
                      <TableCell key={column.id}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ),
              )
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={resolvedColumns.length}
                  className="h-24 text-center text-sm text-destructive"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={resolvedColumns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {emptyState ?? "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {enablePagination ? <DataTablePagination table={table} /> : null}
    </div>
  );
}
