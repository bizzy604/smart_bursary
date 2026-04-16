import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
				<form className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium text-gray-700">
							Email address
						</label>
						<Input id="email" name="email" type="email" autoComplete="email" placeholder="aisha@example.com" required />
					</div>

					<div className="space-y-2">
						<label htmlFor="password" className="text-sm font-medium text-gray-700">
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
						<label htmlFor="county" className="text-sm font-medium text-gray-700">
							County slug
						</label>
						<Input id="county" name="county_slug" placeholder="turkana" required />
					</div>

					<Button type="submit" fullWidth>
						Sign in
					</Button>
				</form>
			</CardContent>

			<CardFooter className="space-y-2 text-center text-sm text-gray-600">
				<Link href="/forgot-password" className="block text-brand-700 hover:underline">
					Forgot your password?
				</Link>
				<p>
					New to the portal?{" "}
					<Link href="/register" className="font-semibold text-brand-700 hover:underline">
						Create account
					</Link>
				</p>
			</CardFooter>
		</Card>
	);
}
