"use client";

import * as React from "react";
import { type Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";

export interface FacetedFilterOption {
	label: string;
	value: string;
	icon?: React.ComponentType<{ className?: string }>;
}

export interface FacetedFilterConfig {
	columnId: string;
	title: string;
	options: FacetedFilterOption[];
}

interface DataTableToolbarProps<TData> {
	table: Table<TData>;
	searchColumnId?: string;
	searchPlaceholder?: string;
	facetedFilters?: FacetedFilterConfig[];
	renderFacetedFilter?: (config: FacetedFilterConfig) => React.ReactNode;
	children?: React.ReactNode;
	showViewOptions?: boolean;
}

export function DataTableToolbar<TData>({
	table,
	searchColumnId,
	searchPlaceholder = "Search...",
	facetedFilters = [],
	renderFacetedFilter,
	children,
	showViewOptions = true,
}: DataTableToolbarProps<TData>) {
	const isFiltered = table.getState().columnFilters.length > 0;
	const searchColumn = searchColumnId ? table.getColumn(searchColumnId) : undefined;

	return (
		<div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
			<div className="flex flex-1 flex-wrap items-center gap-2">
				{searchColumn ? (
					<Input
						value={(searchColumn.getFilterValue() as string) ?? ""}
						onChange={(event) => searchColumn.setFilterValue(event.target.value)}
						placeholder={searchPlaceholder}
						className="h-8 w-full max-w-[240px]"
					/>
				) : null}
				{facetedFilters.map((filter) => {
					if (renderFacetedFilter) return <React.Fragment key={filter.columnId}>{renderFacetedFilter(filter)}</React.Fragment>;
					return null;
				})}
				{isFiltered ? (
					<Button variant="ghost" size="sm" className="h-8 px-2 lg:px-3" onClick={() => table.resetColumnFilters()}>
						Reset
						<X className="ml-2 h-4 w-4" />
					</Button>
				) : null}
			</div>
			<div className="flex items-center gap-2">
				{children}
				{showViewOptions ? <DataTableViewOptions table={table} /> : null}
			</div>
		</div>
	);
}
