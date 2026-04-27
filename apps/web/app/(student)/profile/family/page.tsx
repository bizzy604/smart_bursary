"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrencyKes } from "@/lib/format";
import {
	fetchRawProfile,
	updateFamilyProfile,
	type ProfileFamily,
	type UpdateFamilyPayload,
} from "@/lib/profile-api";

interface FamilyForm {
	familyStatus: string;
	hasDisability: boolean;
	disabilityDetails: string;
	guardianName: string;
	guardianOccupation: string;
	guardianContact: string;
	numSiblings: string;
	numSiblingsInSchool: string;
	numGuardianChildren: string;
	fatherOccupation: string;
	fatherIncomeKes: string;
	motherOccupation: string;
	motherIncomeKes: string;
	guardianIncomeKes: string;
}

const emptyForm: FamilyForm = {
	familyStatus: "",
	hasDisability: false,
	disabilityDetails: "",
	guardianName: "",
	guardianOccupation: "",
	guardianContact: "",
	numSiblings: "",
	numSiblingsInSchool: "",
	numGuardianChildren: "",
	fatherOccupation: "",
	fatherIncomeKes: "",
	motherOccupation: "",
	motherIncomeKes: "",
	guardianIncomeKes: "",
};

const FAMILY_STATUSES = [
	"BOTH_PARENTS",
	"SINGLE_PARENT",
	"ORPHAN",
	"GUARDIAN",
	"OTHER",
] as const;

function fromProfile(family: ProfileFamily | null): FamilyForm {
	if (!family) return emptyForm;
	return {
		familyStatus: family.familyStatus ?? "",
		hasDisability: family.hasDisability ?? false,
		disabilityDetails: family.disabilityDetails ?? "",
		guardianName: family.guardianName ?? "",
		guardianOccupation: family.guardianOccupation ?? "",
		guardianContact: family.guardianContact ?? "",
		numSiblings: family.numSiblings != null ? String(family.numSiblings) : "",
		numSiblingsInSchool:
			family.numSiblingsInSchool != null ? String(family.numSiblingsInSchool) : "",
		numGuardianChildren:
			family.numGuardianChildren != null ? String(family.numGuardianChildren) : "",
		fatherOccupation: family.fatherOccupation ?? "",
		fatherIncomeKes: family.fatherIncomeKes != null ? String(family.fatherIncomeKes) : "",
		motherOccupation: family.motherOccupation ?? "",
		motherIncomeKes: family.motherIncomeKes != null ? String(family.motherIncomeKes) : "",
		guardianIncomeKes:
			family.guardianIncomeKes != null ? String(family.guardianIncomeKes) : "",
	};
}

function toPayload(form: FamilyForm): UpdateFamilyPayload {
	const trimmed = (value: string) => value.trim();
	const num = (value: string): number | undefined => {
		const t = trimmed(value);
		if (t.length === 0) return undefined;
		const parsed = Number(t);
		return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : undefined;
	};

	return {
		familyStatus: trimmed(form.familyStatus) || undefined,
		hasDisability: form.hasDisability,
		disabilityDetails: trimmed(form.disabilityDetails) || undefined,
		guardianName: trimmed(form.guardianName) || undefined,
		guardianOccupation: trimmed(form.guardianOccupation) || undefined,
		guardianContact: trimmed(form.guardianContact) || undefined,
		numSiblings: num(form.numSiblings),
		numSiblingsInSchool: num(form.numSiblingsInSchool),
		numGuardianChildren: num(form.numGuardianChildren),
		fatherOccupation: trimmed(form.fatherOccupation) || undefined,
		fatherIncomeKes: num(form.fatherIncomeKes),
		motherOccupation: trimmed(form.motherOccupation) || undefined,
		motherIncomeKes: num(form.motherIncomeKes),
		guardianIncomeKes: num(form.guardianIncomeKes),
	};
}

export default function FamilyProfilePage() {
	const [family, setFamily] = useState<ProfileFamily | null>(null);
	const [form, setForm] = useState<FamilyForm>(emptyForm);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setIsLoading(true);
			try {
				const raw = await fetchRawProfile();
				if (cancelled) return;
				setFamily(raw.family);
				setForm(fromProfile(raw.family));
				setError(null);
			} catch (reason) {
				if (cancelled) return;
				setError(reason instanceof Error ? reason.message : "Failed to load profile.");
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		}
		void load();
		return () => {
			cancelled = true;
		};
	}, []);

	function startEditing() {
		setForm(fromProfile(family));
		setIsEditing(true);
	}

	function cancelEditing() {
		setForm(fromProfile(family));
		setIsEditing(false);
	}

	async function save() {
		setIsSaving(true);
		try {
			const updated = await updateFamilyProfile(toPayload(form));
			setFamily(updated);
			setForm(fromProfile(updated));
			setIsEditing(false);
			toast.success("Family details updated", {
				description: "Your profile changes have been saved.",
			});
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "Failed to save profile.";
			toast.error("Update failed", { description: message });
		} finally {
			setIsSaving(false);
		}
	}

	if (isLoading) {
		return (
			<section className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground shadow-xs">
				Loading profile...
			</section>
		);
	}

	if (error) {
		return (
			<section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
				{error}
			</section>
		);
	}

	return (
		<main className="space-y-5">
			<section className="rounded-xl border border-border bg-background p-6 shadow-xs">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="font-serif text-2xl font-bold text-primary">Family and Financial Details</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							This information supports fair scoring and committee review decisions.
						</p>
					</div>
					{!isEditing ? (
						<Button onClick={startEditing} variant="outline">
							Edit
						</Button>
					) : null}
				</div>

				<div className="mt-5 grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="family-status">Family Status</Label>
						{isEditing ? (
							<Select
								value={form.familyStatus}
								onValueChange={(value) => setForm({ ...form, familyStatus: value })}
							>
								<SelectTrigger id="family-status">
									<SelectValue placeholder="Select family status" />
								</SelectTrigger>
								<SelectContent>
									{FAMILY_STATUSES.map((value) => (
										<SelectItem key={value} value={value}>
											{value.replace(/_/g, " ")}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<Input id="family-status" value={form.familyStatus} readOnly />
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="family-hasDisability">Applicant has a disability</Label>
						<div className="flex h-9 items-center gap-3">
							<Checkbox
								id="family-hasDisability"
								checked={form.hasDisability}
								disabled={!isEditing}
								onCheckedChange={(checked) =>
									setForm({ ...form, hasDisability: checked === true })
								}
							/>
							<span className="text-sm text-muted-foreground">
								{form.hasDisability ? "Yes" : "No"}
							</span>
						</div>
					</div>
					{form.hasDisability ? (
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="family-disabilityDetails">Disability details</Label>
							<Input
								id="family-disabilityDetails"
								value={form.disabilityDetails}
								readOnly={!isEditing}
								onChange={(event) =>
									setForm({ ...form, disabilityDetails: event.target.value })
								}
							/>
						</div>
					) : null}
					<div className="space-y-2">
						<Label htmlFor="family-guardianName">Guardian Name</Label>
						<Input
							id="family-guardianName"
							value={form.guardianName}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, guardianName: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="family-guardianContact">Guardian Phone</Label>
						<Input
							id="family-guardianContact"
							value={form.guardianContact}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, guardianContact: event.target.value })}
							placeholder="+254712345678"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="family-guardianOccupation">Guardian Occupation</Label>
						<Input
							id="family-guardianOccupation"
							value={form.guardianOccupation}
							readOnly={!isEditing}
							onChange={(event) =>
								setForm({ ...form, guardianOccupation: event.target.value })
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="family-numSiblings">Total Siblings</Label>
						<Input
							id="family-numSiblings"
							inputMode="numeric"
							value={form.numSiblings}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, numSiblings: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="family-numSiblingsInSchool">Siblings in School</Label>
						<Input
							id="family-numSiblingsInSchool"
							inputMode="numeric"
							value={form.numSiblingsInSchool}
							readOnly={!isEditing}
							onChange={(event) =>
								setForm({ ...form, numSiblingsInSchool: event.target.value })
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="family-fatherOccupation">Father Occupation</Label>
						<Input
							id="family-fatherOccupation"
							value={form.fatherOccupation}
							readOnly={!isEditing}
							onChange={(event) =>
								setForm({ ...form, fatherOccupation: event.target.value })
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="family-fatherIncomeKes">Father Annual Income (KES)</Label>
						<Input
							id="family-fatherIncomeKes"
							inputMode="numeric"
							value={isEditing ? form.fatherIncomeKes : formatCurrencyKes(Number(form.fatherIncomeKes) || 0)}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, fatherIncomeKes: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="family-motherOccupation">Mother Occupation</Label>
						<Input
							id="family-motherOccupation"
							value={form.motherOccupation}
							readOnly={!isEditing}
							onChange={(event) =>
								setForm({ ...form, motherOccupation: event.target.value })
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="family-motherIncomeKes">Mother Annual Income (KES)</Label>
						<Input
							id="family-motherIncomeKes"
							inputMode="numeric"
							value={isEditing ? form.motherIncomeKes : formatCurrencyKes(Number(form.motherIncomeKes) || 0)}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, motherIncomeKes: event.target.value })}
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="family-guardianIncomeKes">Guardian Annual Income (KES)</Label>
						<Input
							id="family-guardianIncomeKes"
							inputMode="numeric"
							value={isEditing ? form.guardianIncomeKes : formatCurrencyKes(Number(form.guardianIncomeKes) || 0)}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, guardianIncomeKes: event.target.value })}
						/>
					</div>
				</div>

				{isEditing ? (
					<div className="mt-6 flex flex-wrap gap-3">
						<Button onClick={save} disabled={isSaving}>
							{isSaving ? "Saving..." : "Save changes"}
						</Button>
						<Button variant="outline" onClick={cancelEditing} disabled={isSaving}>
							Cancel
						</Button>
					</div>
				) : null}
			</section>

			<Link href="/profile">
				<Button variant="outline">Back to Profile</Button>
			</Link>
		</main>
	);
}
