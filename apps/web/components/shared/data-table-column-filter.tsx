"use client";

import * as React from "react";
import { type Column } from "@tanstack/react-table";
import { format, isValid, parseISO } from "date-fns";
import { Check, Filter } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ColumnFilterOption = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export type ColumnFilterConfig =
  | { type: "text"; placeholder?: string }
  | {
      type: "select";
      options: ColumnFilterOption[];
      placeholder?: string;
    }
  | {
      type: "multiselect";
      options: ColumnFilterOption[];
      placeholder?: string;
    }
  | { type: "number"; min?: number; max?: number; step?: number; suffix?: string }
  | { type: "dateRange" };

interface DataTableColumnFilterProps<TData> {
  column: Column<TData, unknown>;
  filter: ColumnFilterConfig;
  title?: string;
}

function isDateValue(value: unknown): value is string | Date {
  if (value instanceof Date) {
    return isValid(value);
  }
  if (typeof value === "string") {
    const parsed = parseISO(value);
    return isValid(parsed);
  }
  return false;
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function DataTableColumnFilter<TData>({
  column,
  filter,
  title,
}: DataTableColumnFilterProps<TData>) {
  const filterValue = column.getFilterValue();
  const isActive = filterValue !== undefined && filterValue !== null && filterValue !== "" && !(Array.isArray(filterValue) && filterValue.length === 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Filter ${title ?? column.id}`}
          className={cn(
            "relative h-7 w-7 p-0 text-muted-foreground hover:text-foreground",
            isActive && "text-primary",
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          {isActive ? (
            <span
              aria-hidden
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary"
            />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("p-0", filter.type === "dateRange" ? "w-auto" : "w-[240px]")}
      >
        <FilterBody column={column} filter={filter} title={title} />
      </PopoverContent>
    </Popover>
  );
}

function FilterBody<TData>({
  column,
  filter,
  title,
}: {
  column: Column<TData, unknown>;
  filter: ColumnFilterConfig;
  title?: string;
}) {
  if (filter.type === "text") {
    return <TextFilter column={column} filter={filter} title={title} />;
  }
  if (filter.type === "select") {
    return <SelectFilter column={column} filter={filter} title={title} single />;
  }
  if (filter.type === "multiselect") {
    return <SelectFilter column={column} filter={filter} title={title} />;
  }
  if (filter.type === "number") {
    return <NumberFilter column={column} filter={filter} title={title} />;
  }
  if (filter.type === "dateRange") {
    return <DateRangeFilter column={column} title={title} />;
  }
  return null;
}

function TextFilter<TData>({
  column,
  filter,
  title,
}: {
  column: Column<TData, unknown>;
  filter: Extract<ColumnFilterConfig, { type: "text" }>;
  title?: string;
}) {
  const current = (column.getFilterValue() as string | undefined) ?? "";
  const [draft, setDraft] = React.useState(current);

  React.useEffect(() => {
    setDraft(current);
  }, [current]);

  const apply = () => column.setFilterValue(draft.length > 0 ? draft : undefined);
  const clear = () => {
    setDraft("");
    column.setFilterValue(undefined);
  };

  return (
    <div className="space-y-2 p-3">
      <Label className="text-xs font-medium text-muted-foreground">
        Filter {title ?? column.id}
      </Label>
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={filter.placeholder ?? "Contains…"}
        className="h-8"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
        }}
      />
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>
          Clear
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={apply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

function SelectFilter<TData>({
  column,
  filter,
  title,
  single,
}: {
  column: Column<TData, unknown>;
  filter: Extract<ColumnFilterConfig, { type: "select" | "multiselect" }>;
  title?: string;
  single?: boolean;
}) {
  const facets = column.getFacetedUniqueValues();
  const selected = new Set(
    (column.getFilterValue() as string[] | undefined) ?? [],
  );

  const toggle = (value: string) => {
    if (single) {
      column.setFilterValue([value]);
      return;
    }
    if (selected.has(value)) {
      selected.delete(value);
    } else {
      selected.add(value);
    }
    const next = Array.from(selected);
    column.setFilterValue(next.length > 0 ? next : undefined);
  };

  return (
    <Command>
      <CommandInput placeholder={filter.placeholder ?? title ?? "Search…"} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup>
          {filter.options.map((option) => {
            const isSelected = selected.has(option.value);
            const facetCount = facets?.get(option.value);
            return (
              <CommandItem
                key={option.value}
                onSelect={() => toggle(option.value)}
              >
                <div
                  className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible",
                  )}
                >
                  <Check className="h-4 w-4" />
                </div>
                {option.icon ? (
                  <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                ) : null}
                <span>{option.label}</span>
                {facetCount ? (
                  <span className="ml-auto flex h-4 w-6 items-center justify-center font-mono text-[10px] text-muted-foreground">
                    {facetCount}
                  </span>
                ) : null}
              </CommandItem>
            );
          })}
        </CommandGroup>
        {selected.size > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => column.setFilterValue(undefined)}
                className="justify-center text-center"
              >
                Clear filter
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </Command>
  );
}

function NumberFilter<TData>({
  column,
  filter,
  title,
}: {
  column: Column<TData, unknown>;
  filter: Extract<ColumnFilterConfig, { type: "number" }>;
  title?: string;
}) {
  const current = (column.getFilterValue() as [number?, number?] | undefined) ?? [
    undefined,
    undefined,
  ];
  const [draftMin, setDraftMin] = React.useState(
    current[0] === undefined ? "" : String(current[0]),
  );
  const [draftMax, setDraftMax] = React.useState(
    current[1] === undefined ? "" : String(current[1]),
  );

  React.useEffect(() => {
    setDraftMin(current[0] === undefined ? "" : String(current[0]));
    setDraftMax(current[1] === undefined ? "" : String(current[1]));
  }, [current]);

  const apply = () => {
    const parsedMin = draftMin.trim() === "" ? undefined : Number(draftMin);
    const parsedMax = draftMax.trim() === "" ? undefined : Number(draftMax);
    if (parsedMin === undefined && parsedMax === undefined) {
      column.setFilterValue(undefined);
      return;
    }
    column.setFilterValue([parsedMin, parsedMax]);
  };
  const clear = () => {
    setDraftMin("");
    setDraftMax("");
    column.setFilterValue(undefined);
  };

  return (
    <div className="space-y-2 p-3">
      <Label className="text-xs font-medium text-muted-foreground">
        Filter {title ?? column.id}
        {filter.suffix ? ` (${filter.suffix})` : ""}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          type="number"
          min={filter.min}
          max={filter.max}
          step={filter.step}
          value={draftMin}
          onChange={(event) => setDraftMin(event.target.value)}
          placeholder="Min"
          className="h-8"
        />
        <span className="text-muted-foreground">–</span>
        <Input
          inputMode="numeric"
          type="number"
          min={filter.min}
          max={filter.max}
          step={filter.step}
          value={draftMax}
          onChange={(event) => setDraftMax(event.target.value)}
          placeholder="Max"
          className="h-8"
        />
      </div>
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>
          Clear
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={apply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

function DateRangeFilter<TData>({
  column,
  title,
}: {
  column: Column<TData, unknown>;
  title?: string;
}) {
  const current = column.getFilterValue() as [string?, string?] | undefined;
  const [range, setRange] = React.useState<DateRange | undefined>(() => ({
    from: current?.[0] ? toDate(current[0]) : undefined,
    to: current?.[1] ? toDate(current[1]) : undefined,
  }));

  const apply = () => {
    if (!range?.from && !range?.to) {
      column.setFilterValue(undefined);
      return;
    }
    column.setFilterValue([
      range?.from ? range.from.toISOString() : undefined,
      range?.to ? range.to.toISOString() : undefined,
    ]);
  };

  const clear = () => {
    setRange(undefined);
    column.setFilterValue(undefined);
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-medium text-muted-foreground">
          {title ?? column.id} range
        </Label>
        <span className="text-xs text-muted-foreground">
          {range?.from ? format(range.from, "MMM d") : "—"}
          {" → "}
          {range?.to ? format(range.to, "MMM d, yyyy") : "—"}
        </span>
      </div>
      <Calendar
        mode="range"
        numberOfMonths={1}
        selected={range}
        onSelect={setRange}
        initialFocus
      />
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>
          Clear
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={apply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

export function dateRangeFilterFn<TData>(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  value: [string?, string?] | undefined,
): boolean {
  if (!value || (!value[0] && !value[1])) {
    return true;
  }
  const cell = row.getValue(columnId);
  if (!isDateValue(cell)) {
    return false;
  }
  const time = toDate(cell)?.getTime();
  if (time === undefined) {
    return false;
  }
  const min = value[0] ? toDate(value[0])?.getTime() : undefined;
  const max = value[1] ? toDate(value[1])?.getTime() : undefined;
  if (min !== undefined && time < min) return false;
  if (max !== undefined && time > max + 24 * 60 * 60 * 1000 - 1) return false;
  return true;
}

export function numberRangeFilterFn<TData>(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  value: [number?, number?] | undefined,
): boolean {
  if (!value) return true;
  const cell = Number(row.getValue(columnId));
  if (Number.isNaN(cell)) return false;
  const [min, max] = value;
  if (min !== undefined && cell < min) return false;
  if (max !== undefined && cell > max) return false;
  return true;
}

export function arrayIncludesFilterFn<TData>(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  value: string[] | undefined,
): boolean {
  if (!value || value.length === 0) return true;
  const cell = row.getValue(columnId);
  if (cell === null || cell === undefined) return false;
  return value.includes(String(cell));
}


