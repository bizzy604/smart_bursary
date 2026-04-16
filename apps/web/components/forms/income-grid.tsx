"use client";

import { Input } from "@/components/ui/input";

export interface IncomeGridValue {
	fatherOccupation: string;
	fatherMonthlyIncomeKes: string;
	motherOccupation: string;
	motherMonthlyIncomeKes: string;
	guardianOccupation: string;
	guardianMonthlyIncomeKes: string;
	additionalIncomeSource: string;
	additionalIncomeKes: string;
}

interface IncomeGridProps {
	value: IncomeGridValue;
	onChange: (value: IncomeGridValue) => void;
}

export function IncomeGrid({ value, onChange }: IncomeGridProps) {
	const patch = (field: keyof IncomeGridValue, next: string) => {
		onChange({ ...value, [field]: next });
	};

	return (
		<div className="grid gap-3 md:grid-cols-2">
			<label className="space-y-1 text-sm text-gray-700">
				<span className="font-medium">Father Occupation</span>
				<Input
					placeholder="e.g. Farmer"
					value={value.fatherOccupation}
					onChange={(event) => patch("fatherOccupation", event.target.value)}
				/>
			</label>
			<label className="space-y-1 text-sm text-gray-700">
				<span className="font-medium">Father Monthly Income (KES)</span>
				<Input
					type="number"
					placeholder="0"
					value={value.fatherMonthlyIncomeKes}
					onChange={(event) => patch("fatherMonthlyIncomeKes", event.target.value)}
				/>
			</label>

			<label className="space-y-1 text-sm text-gray-700">
				<span className="font-medium">Mother Occupation</span>
				<Input
					placeholder="e.g. Trader"
					value={value.motherOccupation}
					onChange={(event) => patch("motherOccupation", event.target.value)}
				/>
			</label>
			<label className="space-y-1 text-sm text-gray-700">
				<span className="font-medium">Mother Monthly Income (KES)</span>
				<Input
					type="number"
					placeholder="0"
					value={value.motherMonthlyIncomeKes}
					onChange={(event) => patch("motherMonthlyIncomeKes", event.target.value)}
				/>
			</label>

			<label className="space-y-1 text-sm text-gray-700">
				<span className="font-medium">Guardian Occupation</span>
				<Input
					placeholder="Leave blank if not applicable"
					value={value.guardianOccupation}
					onChange={(event) => patch("guardianOccupation", event.target.value)}
				/>
			</label>
			<label className="space-y-1 text-sm text-gray-700">
				<span className="font-medium">Guardian Monthly Income (KES)</span>
				<Input
					type="number"
					placeholder="0"
					value={value.guardianMonthlyIncomeKes}
					onChange={(event) => patch("guardianMonthlyIncomeKes", event.target.value)}
				/>
			</label>

			<label className="space-y-1 text-sm text-gray-700">
				<span className="font-medium">Other Income Source</span>
				<Input
					placeholder="e.g. Casual labor, remittance"
					value={value.additionalIncomeSource}
					onChange={(event) => patch("additionalIncomeSource", event.target.value)}
				/>
			</label>
			<label className="space-y-1 text-sm text-gray-700">
				<span className="font-medium">Other Income (KES)</span>
				<Input
					type="number"
					placeholder="0"
					value={value.additionalIncomeKes}
					onChange={(event) => patch("additionalIncomeKes", event.target.value)}
				/>
			</label>
		</div>
	);
}

