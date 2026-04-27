"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OCCUPATION_VALUES = [
	'Farmer',
	'Teacher',
	'Doctor',
	'Nurse',
	'Engineer',
	'Accountant',
	'Lawyer',
	'Business',
	'Trader',
	'Driver',
	'Security',
	'Domestic Worker',
	'Civil Servant',
	'Self-Employed',
	'Unemployed',
	'Retired',
	'Student',
	'Other',
] as const;

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
			<label className="space-y-1 text-sm text-foreground/90">
				<span className="font-medium">Father Occupation</span>
				<Select
					value={value.fatherOccupation}
					onValueChange={(val) => patch("fatherOccupation", val)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select occupation" />
					</SelectTrigger>
					<SelectContent>
						{OCCUPATION_VALUES.map((occupation) => (
							<SelectItem key={occupation} value={occupation}>
								{occupation}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</label>
			<label className="space-y-1 text-sm text-foreground/90">
				<span className="font-medium">Father Monthly Income (KES)</span>
				<Input
					type="number"
					placeholder="0"
					value={value.fatherMonthlyIncomeKes}
					onChange={(event) => patch("fatherMonthlyIncomeKes", event.target.value)}
				/>
			</label>

			<label className="space-y-1 text-sm text-foreground/90">
				<span className="font-medium">Mother Occupation</span>
				<Select
					value={value.motherOccupation}
					onValueChange={(val) => patch("motherOccupation", val)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select occupation" />
					</SelectTrigger>
					<SelectContent>
						{OCCUPATION_VALUES.map((occupation) => (
							<SelectItem key={occupation} value={occupation}>
								{occupation}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</label>
			<label className="space-y-1 text-sm text-foreground/90">
				<span className="font-medium">Mother Monthly Income (KES)</span>
				<Input
					type="number"
					placeholder="0"
					value={value.motherMonthlyIncomeKes}
					onChange={(event) => patch("motherMonthlyIncomeKes", event.target.value)}
				/>
			</label>

			<label className="space-y-1 text-sm text-foreground/90">
				<span className="font-medium">Guardian Occupation</span>
				<Select
					value={value.guardianOccupation}
					onValueChange={(val) => patch("guardianOccupation", val)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select occupation" />
					</SelectTrigger>
					<SelectContent>
						{OCCUPATION_VALUES.map((occupation) => (
							<SelectItem key={occupation} value={occupation}>
								{occupation}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</label>
			<label className="space-y-1 text-sm text-foreground/90">
				<span className="font-medium">Guardian Monthly Income (KES)</span>
				<Input
					type="number"
					placeholder="0"
					value={value.guardianMonthlyIncomeKes}
					onChange={(event) => patch("guardianMonthlyIncomeKes", event.target.value)}
				/>
			</label>

			<label className="space-y-1 text-sm text-foreground/90">
				<span className="font-medium">Other Income Source</span>
				<Input
					placeholder="e.g. Casual labor, remittance"
					value={value.additionalIncomeSource}
					onChange={(event) => patch("additionalIncomeSource", event.target.value)}
				/>
			</label>
			<label className="space-y-1 text-sm text-foreground/90">
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

