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
import {
	fetchRawProfile,
	updateAcademicProfile,
	type ProfileAcademic,
	type UpdateAcademicPayload,
} from "@/lib/profile-api";

interface AcademicForm {
	institutionType: string;
	institutionName: string;
	yearFormClass: string;
	admissionNumber: string;
	courseName: string;
	bankAccountName: string;
	bankAccountNumber: string;
	bankName: string;
	bankBranch: string;
}

const emptyForm: AcademicForm = {
	institutionType: "",
	institutionName: "",
	yearFormClass: "",
	admissionNumber: "",
	courseName: "",
	bankAccountName: "",
	bankAccountNumber: "",
	bankName: "",
	bankBranch: "",
};

const INSTITUTION_TYPES = [
	"PRIMARY",
	"SECONDARY",
	"COLLEGE",
	"TVET",
	"UNIVERSITY",
] as const;

const YEARS_OF_STUDY = [
	"Year 1",
	"Year 2",
	"Year 3",
	"Year 4",
	"Year 5",
	"Year 6",
	"Final Year",
] as const;

function fromProfile(academic: ProfileAcademic): AcademicForm {
	return {
		institutionType: academic.institutionType ?? "",
		institutionName: academic.institutionName ?? "",
		yearFormClass: academic.yearFormClass ?? "",
		admissionNumber: academic.admissionNumber ?? "",
		courseName: academic.courseName ?? "",
		bankAccountName: academic.bankAccountName ?? "",
		bankAccountNumber: academic.bankAccountNumber ?? "",
		bankName: academic.bankName ?? "",
		bankBranch: academic.bankBranch ?? "",
	};
}

function toPayload(form: AcademicForm): UpdateAcademicPayload {
	const trimmed = (value: string) => value.trim();
	return {
		institutionType: trimmed(form.institutionType) || undefined,
		institutionName: trimmed(form.institutionName) || undefined,
		yearFormClass: trimmed(form.yearFormClass) || undefined,
		admissionNumber: trimmed(form.admissionNumber) || undefined,
		courseName: trimmed(form.courseName) || undefined,
		bankAccountName: trimmed(form.bankAccountName) || undefined,
		bankAccountNumber: trimmed(form.bankAccountNumber) || undefined,
		bankName: trimmed(form.bankName) || undefined,
		bankBranch: trimmed(form.bankBranch) || undefined,
	};
}

export default function AcademicProfilePage() {
	const [academic, setAcademic] = useState<ProfileAcademic | null>(null);
	const [form, setForm] = useState<AcademicForm>(emptyForm);
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
				setAcademic(raw.academic);
				setForm(fromProfile(raw.academic));
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
		if (academic) setForm(fromProfile(academic));
		setIsEditing(true);
	}

	function cancelEditing() {
		if (academic) setForm(fromProfile(academic));
		setIsEditing(false);
	}

	async function save() {
		setIsSaving(true);
		try {
			const updated = await updateAcademicProfile(toPayload(form));
			setAcademic(updated);
			setForm(fromProfile(updated));
			setIsEditing(false);
			toast.success("Academic details updated", {
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

	if (error || !academic) {
		return (
			<section className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
				{error ?? "Failed to load profile."}
			</section>
		);
	}

	return (
		<main className="space-y-5">
			<section className="rounded-xl border border-border bg-background p-6 shadow-xs">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="font-serif text-2xl font-bold text-primary">Academic Details</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							These details guide eligibility checks for county bursary programs.
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
						<Label htmlFor="academic-institutionType">Institution Type</Label>
						{isEditing ? (
							<Select
								value={form.institutionType}
								onValueChange={(value) => setForm({ ...form, institutionType: value })}
							>
								<SelectTrigger id="academic-institutionType">
									<SelectValue placeholder="Select institution type" />
								</SelectTrigger>
								<SelectContent>
									{INSTITUTION_TYPES.map((value) => (
										<SelectItem key={value} value={value}>
											{value}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<Input id="academic-institutionType" value={form.institutionType} readOnly />
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="academic-institutionName">Institution Name</Label>
						<Input
							id="academic-institutionName"
							value={form.institutionName}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, institutionName: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="academic-yearFormClass">Year of Study / Form / Class</Label>
						{isEditing ? (
							<Select
								value={form.yearFormClass}
								onValueChange={(value) => setForm({ ...form, yearFormClass: value })}
							>
								<SelectTrigger id="academic-yearFormClass">
									<SelectValue placeholder="Select year of study" />
								</SelectTrigger>
								<SelectContent>
									{YEARS_OF_STUDY.map((value) => (
										<SelectItem key={value} value={value}>
											{value}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<Input id="academic-yearFormClass" value={form.yearFormClass} readOnly />
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="academic-admissionNumber">Admission Number</Label>
						<Input
							id="academic-admissionNumber"
							value={form.admissionNumber}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, admissionNumber: event.target.value })}
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="academic-courseName">Course / Programme</Label>
						<Input
							id="academic-courseName"
							value={form.courseName}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, courseName: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="academic-bankName">Bank Name</Label>
						<Input
							id="academic-bankName"
							value={form.bankName}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, bankName: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="academic-bankBranch">Bank Branch</Label>
						<Input
							id="academic-bankBranch"
							value={form.bankBranch}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, bankBranch: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="academic-bankAccountName">Account Name</Label>
						<Input
							id="academic-bankAccountName"
							value={form.bankAccountName}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, bankAccountName: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="academic-bankAccountNumber">Account Number</Label>
						<Input
							id="academic-bankAccountNumber"
							value={form.bankAccountNumber}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, bankAccountNumber: event.target.value })}
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
