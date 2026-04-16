"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SiblingRow {
	id: string;
	name: string;
	institution: string;
	level: string;
	annualFeeKes: string;
	feePaidKes: string;
}

interface SiblingTableProps {
	rows: SiblingRow[];
	onChange: (rows: SiblingRow[]) => void;
}

function createSiblingRow(): SiblingRow {
	return {
		id: crypto.randomUUID(),
		name: "",
		institution: "",
		level: "",
		annualFeeKes: "",
		feePaidKes: "",
	};
}

export function SiblingTable({ rows, onChange }: SiblingTableProps) {
	const addRow = () => {
		onChange([...rows, createSiblingRow()]);
	};

	const updateRow = (id: string, field: keyof Omit<SiblingRow, "id">, value: string) => {
		onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
	};

	const removeRow = (id: string) => {
		onChange(rows.filter((row) => row.id !== id));
	};

	return (
		<div className="space-y-3">
			{rows.length === 0 ? (
				<p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
					No siblings added yet.
				</p>
			) : null}

			{rows.map((row, index) => (
				<article key={row.id} className="space-y-3 rounded-xl border border-gray-200 p-3">
					<div className="flex items-center justify-between">
						<h4 className="font-display text-sm font-semibold text-brand-900">Sibling {index + 1}</h4>
						<Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => removeRow(row.id)}>
							Remove
						</Button>
					</div>

					<div className="grid gap-3 md:grid-cols-2">
						<label className="space-y-1 text-sm text-gray-700">
							<span className="font-medium">Full Name</span>
							<Input
								placeholder="Enter full name"
								value={row.name}
								onChange={(event) => updateRow(row.id, "name", event.target.value)}
							/>
						</label>
						<label className="space-y-1 text-sm text-gray-700">
							<span className="font-medium">Institution</span>
							<Input
								placeholder="School or college"
								value={row.institution}
								onChange={(event) => updateRow(row.id, "institution", event.target.value)}
							/>
						</label>
						<label className="space-y-1 text-sm text-gray-700">
							<span className="font-medium">Class / Level</span>
							<Input
								placeholder="e.g. Form 3"
								value={row.level}
								onChange={(event) => updateRow(row.id, "level", event.target.value)}
							/>
						</label>
						<label className="space-y-1 text-sm text-gray-700">
							<span className="font-medium">Annual Fee (KES)</span>
							<Input
								type="number"
								placeholder="0"
								value={row.annualFeeKes}
								onChange={(event) => updateRow(row.id, "annualFeeKes", event.target.value)}
							/>
						</label>
						<label className="space-y-1 text-sm text-gray-700">
							<span className="font-medium">Fee Paid (KES)</span>
							<Input
								type="number"
								placeholder="0"
								value={row.feePaidKes}
								onChange={(event) => updateRow(row.id, "feePaidKes", event.target.value)}
							/>
						</label>
					</div>
				</article>
			))}

			<Button variant="secondary" onClick={addRow}>
				Add Sibling
			</Button>
		</div>
	);
}

