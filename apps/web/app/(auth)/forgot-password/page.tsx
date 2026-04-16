import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Reset your password</CardTitle>
				<CardDescription>
					Provide your email and county slug to receive a secure reset token.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium text-gray-700">
							Email address
						</label>
						<Input id="email" name="email" type="email" autoComplete="email" required />
					</div>

					<div className="space-y-2">
						<label htmlFor="county" className="text-sm font-medium text-gray-700">
							County slug
						</label>
						<Input id="county" name="county_slug" placeholder="turkana" required />
					</div>

					<Button type="submit" fullWidth>
						Send reset token
					</Button>
				</form>
			</CardContent>

			<CardFooter className="text-center text-sm text-gray-600">
				<Link href="/login" className="font-semibold text-brand-700 hover:underline">
					Back to sign in
				</Link>
			</CardFooter>
		</Card>
	);
}
