"use client";

import { type Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
	table: Table<TData>;
	pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
	table,
	pageSizeOptions = [10, 20, 30, 50, 100],
}: DataTablePaginationProps<TData>) {
	const pageIndex = table.getState().pagination.pageIndex;
	const pageCount = table.getPageCount();
	const selectedCount = table.getFilteredSelectedRowModel().rows.length;
	const totalCount = table.getFilteredRowModel().rows.length;

	return (
		<div className="flex flex-col gap-4 px-2 py-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex-1 text-sm text-muted-foreground">
				{selectedCount > 0 ? (
					<span>
						{selectedCount} of {totalCount} row(s) selected.
					</span>
				) : (
					<span>
						{totalCount} row{totalCount === 1 ? "" : "s"} total.
					</span>
				)}
			</div>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
				<div className="flex items-center gap-2">
					<p className="text-sm font-medium">Rows per page</p>
					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value) => table.setPageSize(Number(value))}
					>
						<SelectTrigger className="h-8 w-[72px]">
							<SelectValue placeholder={table.getState().pagination.pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{pageSizeOptions.map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center justify-center text-sm font-medium">
					Page {pageIndex + 1} of {Math.max(pageCount, 1)}
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon"
						className="hidden lg:flex"
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
						aria-label="First page"
					>
						<ChevronsLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						aria-label="Previous page"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						aria-label="Next page"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="hidden lg:flex"
						onClick={() => table.setPageIndex(pageCount - 1)}
						disabled={!table.getCanNextPage()}
						aria-label="Last page"
					>
						<ChevronsRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
