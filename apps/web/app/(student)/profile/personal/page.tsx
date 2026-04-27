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
	updatePersonalProfile,
	type ProfilePersonal,
	type UpdatePersonalPayload,
} from "@/lib/profile-api";

interface PersonalForm {
	fullName: string;
	nationalId: string;
	dateOfBirth: string;
	gender: string;
	homeWard: string;
	villageUnit: string;
	phone: string;
}

const emptyForm: PersonalForm = {
	fullName: "",
	nationalId: "",
	dateOfBirth: "",
	gender: "",
	homeWard: "",
	villageUnit: "",
	phone: "",
};

const GENDERS = ["FEMALE", "MALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;

function fromProfile(personal: ProfilePersonal): PersonalForm {
	return {
		fullName: personal.fullName ?? "",
		nationalId: personal.nationalId ?? "",
		dateOfBirth: personal.dateOfBirth ? personal.dateOfBirth.slice(0, 10) : "",
		gender: personal.gender ?? "",
		homeWard: personal.homeWard ?? "",
		villageUnit: personal.villageUnit ?? "",
		phone: personal.phone ?? "",
	};
}

function toPayload(form: PersonalForm): UpdatePersonalPayload {
	const trimmed = (value: string) => value.trim();
	return {
		fullName: trimmed(form.fullName) || undefined,
		nationalId: trimmed(form.nationalId) || undefined,
		dateOfBirth: trimmed(form.dateOfBirth) || undefined,
		gender: trimmed(form.gender) || undefined,
		homeWard: trimmed(form.homeWard) || undefined,
		villageUnit: trimmed(form.villageUnit) || undefined,
		phone: trimmed(form.phone) || undefined,
	};
}

export default function PersonalProfilePage() {
	const [personal, setPersonal] = useState<ProfilePersonal | null>(null);
	const [form, setForm] = useState<PersonalForm>(emptyForm);
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
				setPersonal(raw.personal);
				setForm(fromProfile(raw.personal));
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
		if (personal) setForm(fromProfile(personal));
		setIsEditing(true);
	}

	function cancelEditing() {
		if (personal) setForm(fromProfile(personal));
		setIsEditing(false);
	}

	async function save() {
		setIsSaving(true);
		try {
			const updated = await updatePersonalProfile(toPayload(form));
			setPersonal(updated);
			setForm(fromProfile(updated));
			setIsEditing(false);
			toast.success("Personal details updated", {
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

	if (error || !personal) {
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
						<h1 className="font-serif text-2xl font-bold text-primary">Personal Details</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							These details are pre-filled into Section A of your application.
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
						<Label htmlFor="personal-fullName">Full Name</Label>
						<Input
							id="personal-fullName"
							value={form.fullName}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, fullName: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="personal-nationalId">National ID / Birth Cert</Label>
						<Input
							id="personal-nationalId"
							value={form.nationalId}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, nationalId: event.target.value })}
							placeholder="6–20 digits"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="personal-dob">Date of Birth</Label>
						<Input
							id="personal-dob"
							type="date"
							value={form.dateOfBirth}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="personal-gender">Gender</Label>
						{isEditing ? (
							<Select
								value={form.gender}
								onValueChange={(value) => setForm({ ...form, gender: value })}
							>
								<SelectTrigger id="personal-gender">
									<SelectValue placeholder="Select gender" />
								</SelectTrigger>
								<SelectContent>
									{GENDERS.map((value) => (
										<SelectItem key={value} value={value}>
											{value.replace(/_/g, " ")}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<Input id="personal-gender" value={form.gender} readOnly />
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="personal-homeWard">Home Ward</Label>
						<Input
							id="personal-homeWard"
							value={form.homeWard}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, homeWard: event.target.value })}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="personal-village">Village / Settlement Unit</Label>
						<Input
							id="personal-village"
							value={form.villageUnit}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, villageUnit: event.target.value })}
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="personal-phone">Phone Number</Label>
						<Input
							id="personal-phone"
							value={form.phone}
							readOnly={!isEditing}
							onChange={(event) => setForm({ ...form, phone: event.target.value })}
							placeholder="+254712345678"
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
