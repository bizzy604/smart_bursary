"use client";

import * as React from "react";
import { type Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	DataTableColumnFilter,
	type ColumnFilterConfig,
} from "./data-table-column-filter";

interface DataTableColumnHeaderProps<TData, TValue>
	extends React.HTMLAttributes<HTMLDivElement> {
	column: Column<TData, TValue>;
	title: string;
	filter?: ColumnFilterConfig;
	align?: "start" | "end";
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
	filter,
	align = "start",
	className,
}: DataTableColumnHeaderProps<TData, TValue>) {
	const canSort = column.getCanSort();
	const filterEl = filter ? (
		<DataTableColumnFilter
			column={column as unknown as Column<TData, unknown>}
			filter={filter}
			title={title}
		/>
	) : null;

	if (!canSort) {
		return (
			<div
				className={cn(
					"flex items-center gap-1",
					align === "end" && "justify-end",
					className,
				)}
			>
				<span>{title}</span>
				{filterEl}
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex items-center gap-1",
				align === "end" && "justify-end",
				className,
			)}
		>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className={cn(
							"h-8 -ml-3 data-[state=open]:bg-accent",
							align === "end" && "ml-0 -mr-3",
						)}
					>
						<span>{title}</span>
						{column.getIsSorted() === "desc" ? (
							<ArrowDown className="ml-2 h-4 w-4" />
						) : column.getIsSorted() === "asc" ? (
							<ArrowUp className="ml-2 h-4 w-4" />
						) : (
							<ChevronsUpDown className="ml-2 h-4 w-4" />
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align={align}>
					<DropdownMenuItem onClick={() => column.toggleSorting(false)}>
						<ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
						Asc
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => column.toggleSorting(true)}>
						<ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
						Desc
					</DropdownMenuItem>
					{column.getCanHide() ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
								<EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
								Hide
							</DropdownMenuItem>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
			{filterEl}
		</div>
	);
}
