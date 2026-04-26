"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOpsTenant } from "@/lib/ops-api";

export default function CreateCountyPage() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		slug: "",
		planTier: "BASIC",
		fundName: "",
		legalReference: "",
		primaryColor: "#1E3A5F",
		superAdminEmail: "",
		superAdminPassword: "",
		superAdminPhone: "",
	});

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setIsLoading(true);

		try {
			await createOpsTenant({
				slug: formData.slug,
				name: formData.name,
				planTier: formData.planTier,
				fundName: formData.fundName || undefined,
				legalReference: formData.legalReference || undefined,
				primaryColor: formData.primaryColor,
				superAdmin: {
					email: formData.superAdminEmail,
					password: formData.superAdminPassword,
					phone: formData.superAdminPhone || undefined,
				},
			});
			toast.success("County created successfully", {
				description: `${formData.name} has been added to the tenant registry.`,
			});
			router.push("/tenants");
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to create county";
			toast.error("Creation failed", { description: message });
		} finally {
			setIsLoading(false);
		}
	};

	const generateSlug = (name: string) => {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
	};

	const handleNameChange = (value: string) => {
		setFormData((prev) => ({
			...prev,
			name: value,
			slug: generateSlug(value),
		}));
	};

	return (
		<main className="space-y-5">
			<PageHeader
				eyebrow="Operations"
				title="Create New County"
				description="Provision a new county tenant in the system with its own bursary fund and administrative scope."
				icon={Building2}
			/>

			<section className="max-w-2xl rounded-2xl border border-border/80 bg-background p-6 shadow-xs">
				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="name">County Name</Label>
						<Input
							id="name"
							type="text"
							placeholder="e.g., Turkana County"
							value={formData.name}
							onChange={(e) => handleNameChange(e.target.value)}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="slug">Slug</Label>
						<Input
							id="slug"
							type="text"
							placeholder="e.g., turkana"
							value={formData.slug}
							onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
							required
						/>
						<p className="text-xs text-muted-foreground">
							URL-safe identifier for the county (auto-generated from name)
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="planTier">Plan Tier</Label>
						<Select value={formData.planTier} onValueChange={(value) => setFormData((prev) => ({ ...prev, planTier: value }))}>
							<SelectTrigger id="planTier">
								<SelectValue placeholder="Select plan tier" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="BASIC">Basic</SelectItem>
								<SelectItem value="STANDARD">Standard</SelectItem>
								<SelectItem value="ENTERPRISE">Enterprise</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Determines available features and resource limits
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="fundName">Bursary Fund Name</Label>
						<Input
							id="fundName"
							type="text"
							placeholder="e.g., Turkana County Bursary Fund"
							value={formData.fundName}
							onChange={(e) => setFormData((prev) => ({ ...prev, fundName: e.target.value }))}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="legalReference">Legal Reference</Label>
						<Input
							id="legalReference"
							type="text"
							placeholder="e.g., County Bursary Act 2023"
							value={formData.legalReference}
							onChange={(e) => setFormData((prev) => ({ ...prev, legalReference: e.target.value }))}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="primaryColor">Primary Color</Label>
						<div className="flex gap-2">
							<Input
								id="primaryColor"
								type="color"
								value={formData.primaryColor}
								onChange={(e) => setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))}
								className="h-10 w-20"
							/>
							<Input
								type="text"
								value={formData.primaryColor}
								onChange={(e) => setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))}
								className="flex-1"
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							Brand color for the county admin interface
						</p>
					</div>

					<div className="border-t border-border/80 pt-6">
						<h3 className="text-lg font-semibold text-primary mb-4">Super Admin Account</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Create the initial county administrator account for this tenant.
						</p>

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="superAdminEmail">Email</Label>
								<Input
									id="superAdminEmail"
									type="email"
									placeholder="admin@turkana.example.com"
									value={formData.superAdminEmail}
									onChange={(e) => setFormData((prev) => ({ ...prev, superAdminEmail: e.target.value }))}
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="superAdminPassword">Password</Label>
								<Input
									id="superAdminPassword"
									type="password"
									placeholder="••••••••••••"
									value={formData.superAdminPassword}
									onChange={(e) => setFormData((prev) => ({ ...prev, superAdminPassword: e.target.value }))}
									required
									minLength={10}
								/>
								<p className="text-xs text-muted-foreground">
									Minimum 10 characters
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="superAdminPhone">Phone (Optional)</Label>
								<Input
									id="superAdminPhone"
									type="tel"
									placeholder="+254700123456"
									value={formData.superAdminPhone}
									onChange={(e) => setFormData((prev) => ({ ...prev, superAdminPhone: e.target.value }))}
								/>
							</div>
						</div>
					</div>

					<div className="flex gap-3 pt-4">
						<Button type="button" variant="outline" onClick={() => router.push("/tenants")} disabled={isLoading}>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Creating..." : "Create County"}
						</Button>
					</div>
				</form>
			</section>
		</main>
	);
}
