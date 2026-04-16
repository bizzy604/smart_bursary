import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
	return (
		<main className="page-shell flex min-h-dvh items-center justify-center px-4 py-10">
			<Card className="w-full max-w-lg">
				<CardHeader>
					<CardTitle>Page not found</CardTitle>
					<CardDescription>
						The page you requested is not available in this portal route.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Link href="/login">
						<Button>Go to sign in</Button>
					</Link>
				</CardContent>
			</Card>
		</main>
	);
}
