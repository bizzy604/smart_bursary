"use client";

import * as React from "react";
import { type Row, type Table } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface BulkActionField {
	id: string;
	label: string;
	type: "number" | "text" | "textarea";
	placeholder?: string;
	required?: boolean;
	min?: number;
	step?: number;
	defaultValue?: string;
	suffix?: string;
}

export interface BulkActionDefinition<TData> {
	id: string;
	label: string;
	variant?: "default" | "destructive" | "outline" | "secondary";
	confirmLabel?: string;
	confirmTitle: string;
	confirmDescription:
		| string
		| ((selectedRows: Row<TData>[]) => string);
	fields?: BulkActionField[];
	disabled?: (selectedRows: Row<TData>[]) => boolean;
	hidden?: (selectedRows: Row<TData>[]) => boolean;
	onRun: (
		selectedRows: Row<TData>[],
		values: Record<string, string>,
	) => Promise<void> | void;
}

export interface BulkActionBarProps<TData> {
	table: Table<TData>;
	selectedRows: Row<TData>[];
	selectedCount: number;
	clearSelection: () => void;
	actions: BulkActionDefinition<TData>[];
	onSuccess?: () => void;
}

export function BulkActionBar<TData>({
	table: _table,
	selectedRows,
	selectedCount: _selectedCount,
	clearSelection,
	actions,
	onSuccess,
}: BulkActionBarProps<TData>) {
	const [pending, setPending] = React.useState<BulkActionDefinition<TData> | null>(
		null,
	);
	const [values, setValues] = React.useState<Record<string, string>>({});
	const [isMutating, setIsMutating] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const openAction = (action: BulkActionDefinition<TData>) => {
		const defaults: Record<string, string> = {};
		(action.fields ?? []).forEach((field) => {
			defaults[field.id] = field.defaultValue ?? "";
		});
		setValues(defaults);
		setError(null);
		setPending(action);
	};

	const closeAction = () => {
		if (isMutating) return;
		setPending(null);
		setError(null);
		setValues({});
	};

	const runAction = async () => {
		if (!pending) return;
		const requiredMissing = (pending.fields ?? []).some(
			(field) => field.required && !values[field.id]?.trim(),
		);
		if (requiredMissing) {
			setError("Please fill in all required fields.");
			return;
		}
		setIsMutating(true);
		setError(null);
		const count = selectedRows.length;
		const actionLabel = pending.label;
		try {
			await pending.onRun(selectedRows, values);
			setPending(null);
			setValues({});
			clearSelection();
			onSuccess?.();
			toast.success(`${actionLabel} applied`, {
				description: `${count} ${count === 1 ? "row" : "rows"} updated successfully.`,
			});
		} catch (reason: unknown) {
			const message =
				reason instanceof Error
					? reason.message
					: "Bulk action failed. Try again.";
			setError(message);
			toast.error(`${actionLabel} failed`, { description: message });
		} finally {
			setIsMutating(false);
		}
	};

	const visibleActions = actions.filter(
		(action) => !action.hidden?.(selectedRows),
	);

	const description: string | undefined = pending
		? typeof pending.confirmDescription === "function"
			? pending.confirmDescription(selectedRows)
			: pending.confirmDescription
		: undefined;

	return (
		<>
			{visibleActions.map((action) => {
				const isDisabled = action.disabled?.(selectedRows) ?? false;
				return (
					<Button
						key={action.id}
						variant={action.variant ?? "default"}
						size="sm"
						className="h-8"
						disabled={isDisabled || isMutating}
						onClick={() => openAction(action)}
					>
						{action.label}
					</Button>
				);
			})}

			<AlertDialog
				open={pending !== null}
				onOpenChange={(open) => {
					if (!open) closeAction();
				}}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>{pending?.confirmTitle}</AlertDialogTitle>
						{description ? (
							<AlertDialogDescription>{description}</AlertDialogDescription>
						) : null}
					</AlertDialogHeader>

					{pending?.fields && pending.fields.length > 0 ? (
						<div className="space-y-3">
							{pending.fields.map((field) => (
								<div key={field.id} className="space-y-1.5">
									<Label htmlFor={`bulk-${field.id}`} className="text-xs">
										{field.label}
										{field.required ? (
											<span className="text-destructive"> *</span>
										) : null}
										{field.suffix ? (
											<span className="ml-1 text-muted-foreground">
												({field.suffix})
											</span>
										) : null}
									</Label>
									{field.type === "textarea" ? (
										<Textarea
											id={`bulk-${field.id}`}
											value={values[field.id] ?? ""}
											onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
												setValues((prev) => ({
													...prev,
													[field.id]: event.target.value,
												}))
											}
											placeholder={field.placeholder}
											rows={3}
										/>
									) : (
										<Input
											id={`bulk-${field.id}`}
											type={field.type}
											inputMode={field.type === "number" ? "numeric" : "text"}
											min={field.min}
											step={field.step}
											value={values[field.id] ?? ""}
											onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
												setValues((prev) => ({
													...prev,
													[field.id]: event.target.value,
												}))
											}
											placeholder={field.placeholder}
										/>
									)}
								</div>
							))}
						</div>
					) : null}

					{error ? (
						<p className="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
							{error}
						</p>
					) : null}

					<AlertDialogFooter>
						<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
						<AlertDialogAction asChild>
							<Button
								onClick={(event) => {
									event.preventDefault();
									void runAction();
								}}
								disabled={isMutating}
								variant={pending?.variant ?? "default"}
							>
								{isMutating ? (
									<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
								) : null}
								{pending?.confirmLabel ?? "Confirm"}
							</Button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
