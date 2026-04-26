"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ApiClientError, apiRequestJson } from "@/lib/api-client";
import { useCounties } from "@/hooks/use-counties";

interface RegisterResponse {
	accessToken: string;
	emailVerificationToken?: string;
}

export default function RegisterPage() {
	const router = useRouter();
	const { counties, isLoading: countiesLoading } = useCounties();
	const [countySlug, setCountySlug] = useState<string>("turkana");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSubmitting) {
			return;
		}

		const formData = new FormData(event.currentTarget);
		const fullName = String(formData.get("full_name") ?? "").trim();
		const email = String(formData.get("email") ?? "").trim().toLowerCase();
		const phone = String(formData.get("phone") ?? "").trim();
		const selectedCounty = countySlug.trim().toLowerCase();
		const password = String(formData.get("password") ?? "");
		const confirmPassword = String(formData.get("confirm_password") ?? "");

		if (!fullName || !email || !phone || !selectedCounty || !password) {
			setErrorMessage("All fields are required.");
			return;
		}
		if (password !== confirmPassword) {
			setErrorMessage("Passwords do not match.");
			return;
		}
		if (password.length < 8) {
			setErrorMessage("Password must be at least 8 characters.");
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			// Backend DTO uses camelCase; map the snake_case form fields here.
			await apiRequestJson<RegisterResponse>("/auth/register", {
				method: "POST",
				body: JSON.stringify({ fullName, email, phone, countySlug: selectedCounty, password }),
			});

			// Auto sign-in so the user lands authenticated rather than
			// hitting /login again.
			const result = await signIn("credentials", {
				email,
				password,
				countySlug: selectedCounty,
				redirect: false,
			});

			if (!result || result.error) {
				// Account was created but auto-login failed; send them to login.
				router.push("/login?registered=1");
				return;
			}

			router.push("/");
			router.refresh();
		} catch (reason) {
			if (reason instanceof ApiClientError) {
				const detail = reason.details?.[0]?.message;
				setErrorMessage(detail ?? reason.message);
			} else {
				setErrorMessage("Unable to create account right now. Please try again.");
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create student account</CardTitle>
				<CardDescription>
					Register once to apply for active county bursary programs and track progress.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form className="space-y-4" method="post" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<label htmlFor="fullName" className="text-sm font-medium text-foreground/90">
							Full name
						</label>
						<Input id="fullName" name="full_name" autoComplete="name" placeholder="Aisha Lokiru" required />
					</div>

					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium text-foreground/90">
							Email address
						</label>
						<Input id="email" name="email" type="email" autoComplete="email" placeholder="aisha@example.com" required />
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label htmlFor="phone" className="text-sm font-medium text-foreground/90">
								Phone number
							</label>
							<Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+254712345678" required />
						</div>

						<div className="space-y-2">
							<label htmlFor="county" className="text-sm font-medium text-foreground/90">
								County
							</label>
							<input type="hidden" name="county_slug" value={countySlug} />
							<Select
								value={countySlug}
								onValueChange={setCountySlug}
								disabled={countiesLoading}
							>
								<SelectTrigger id="county">
									<SelectValue placeholder="Select county" />
								</SelectTrigger>
								<SelectContent>
									{counties.map((county) => (
										<SelectItem key={county.slug} value={county.slug}>
											{county.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{countiesLoading ? <p className="text-xs text-muted-foreground">Loading counties…</p> : null}
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label htmlFor="password" className="text-sm font-medium text-foreground/90">
								Password
							</label>
							<Input id="password" name="password" type="password" autoComplete="new-password" required />
						</div>

						<div className="space-y-2">
							<label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/90">
								Confirm password
							</label>
							<Input
								id="confirmPassword"
								name="confirm_password"
								type="password"
								autoComplete="new-password"
								required
							/>
						</div>
					</div>

					<p className="text-xs text-muted-foreground">
						Use at least 8 characters with one uppercase, one lowercase, one number, and one symbol.
					</p>

					<Button type="submit" fullWidth disabled={isSubmitting}>
						{isSubmitting ? "Creating account..." : "Create account"}
					</Button>

					{errorMessage ? (
						<p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{errorMessage}
						</p>
					) : null}
				</form>
			</CardContent>

			<CardFooter className="text-center text-sm text-muted-foreground">
				<p>
					Already registered?{" "}
					<Link href="/login" className="font-semibold text-secondary hover:underline">
						Sign in
					</Link>
				</p>
			</CardFooter>
		</Card>
	);
}
