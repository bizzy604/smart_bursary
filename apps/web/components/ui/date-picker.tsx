"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
	value?: Date;
	onChange?: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	triggerClassName?: string;
	formatStr?: string;
}

export function DatePicker({
	value,
	onChange,
	placeholder = "Pick a date",
	disabled,
	className,
	triggerClassName,
	formatStr = "PPP",
}: DatePickerProps) {
	return (
		<div className={className}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						disabled={disabled}
						className={cn(
							"w-full justify-start text-left font-normal",
							!value && "text-muted-foreground",
							triggerClassName,
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{value ? format(value, formatStr) : <span>{placeholder}</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar mode="single" selected={value} onSelect={onChange} autoFocus />
				</PopoverContent>
			</Popover>
		</div>
	);
}
