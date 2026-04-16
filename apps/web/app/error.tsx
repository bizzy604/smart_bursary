"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main className="page-shell flex min-h-dvh items-center justify-center px-4 py-10">
			<Card className="w-full max-w-lg">
				<CardHeader>
					<CardTitle>Something went wrong</CardTitle>
					<CardDescription>
						The portal hit an unexpected issue. You can retry now or return to sign in.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-3">
					<Button onClick={reset}>Try again</Button>
					<Link href="/login">
						<Button variant="outline">Back to sign in</Button>
					</Link>
				</CardContent>
			</Card>
		</main>
	);
}
