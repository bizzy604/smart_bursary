"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useCounties } from "@/hooks/use-counties";

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { counties, isLoading: countiesLoading } = useCounties();
	const [countySlug, setCountySlug] = useState<string>("turkana");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(() => {
		const reason = searchParams?.get("reason");
		if (reason === "expired") {
			return "Your session expired. Please sign in again.";
		}
		return null;
	});

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSubmitting) {
			return;
		}

		const formData = new FormData(event.currentTarget);
		const email = String(formData.get("email") ?? "").trim();
		const password = String(formData.get("password") ?? "");
		const selectedCounty = countySlug.trim().toLowerCase();

		if (!email || !password || !selectedCounty) {
			setErrorMessage("Enter your email, password, and county to continue.");
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			const result = await signIn("credentials", {
				email,
				password,
				countySlug: selectedCounty,
				redirect: false,
			});

			if (!result || result.error) {
				setErrorMessage("Invalid credentials. Check your email, password, and county.");
				return;
			}

			const fromParam = searchParams?.get("from");
			// Reject protocol-relative URLs ("//evil.com") which pass startsWith("/")
			// but navigate cross-origin — only accept same-site absolute paths.
			const isSafeFrom =
				typeof fromParam === "string" &&
				fromParam.startsWith("/") &&
				!fromParam.startsWith("//") &&
				!fromParam.startsWith("/\\");
			const destination = (isSafeFrom ? fromParam : "/") as Route;
			// The middleware will redirect "/" to the role-appropriate home so we
			// don't have to decode the JWT here.
			router.push(destination);
			router.refresh();
		} catch {
			setErrorMessage("Unable to sign in right now. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form className="space-y-4" method="post" onSubmit={handleSubmit}>
			<div className="space-y-2">
				<label htmlFor="email" className="text-sm font-medium text-foreground/90">
					Email address
				</label>
				<Input id="email" name="email" type="email" autoComplete="email" placeholder="aisha@example.com" required />
			</div>

			<div className="space-y-2">
				<label htmlFor="password" className="text-sm font-medium text-foreground/90">
					Password
				</label>
				<Input
					id="password"
					name="password"
					type="password"
					autoComplete="current-password"
					placeholder="Enter your password"
					required
				/>
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

			<Button type="submit" fullWidth disabled={isSubmitting || countiesLoading}>
				{isSubmitting ? "Signing in..." : "Sign in"}
			</Button>

			{errorMessage ? (
				<p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{errorMessage}
				</p>
			) : null}
		</form>
	);
}

export default function LoginPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Sign in to your portal</CardTitle>
				<CardDescription>
					Access your bursary applications, county notices, and decision updates.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<Suspense fallback={<div className="py-6 text-sm text-muted-foreground">Loading…</div>}>
					<LoginForm />
				</Suspense>
			</CardContent>

			<CardFooter className="space-y-2 text-center text-sm text-muted-foreground">
				<Link href="/forgot-password" className="block text-secondary hover:underline">
					Forgot your password?
				</Link>
				<p>
					New to the portal?{" "}
					<Link href="/register" className="font-semibold text-secondary hover:underline">
						Create account
					</Link>
				</p>
			</CardFooter>
		</Card>
	);
}
