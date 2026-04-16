import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Create student account</CardTitle>
				<CardDescription>
					Register once to apply for active county bursary programs and track progress.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="fullName" className="text-sm font-medium text-gray-700">
							Full name
						</label>
						<Input id="fullName" name="full_name" autoComplete="name" placeholder="Aisha Lokiru" required />
					</div>

					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium text-gray-700">
							Email address
						</label>
						<Input id="email" name="email" type="email" autoComplete="email" placeholder="aisha@example.com" required />
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label htmlFor="phone" className="text-sm font-medium text-gray-700">
								Phone number
							</label>
							<Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+254712345678" required />
						</div>

						<div className="space-y-2">
							<label htmlFor="county" className="text-sm font-medium text-gray-700">
								County slug
							</label>
							<Input id="county" name="county_slug" placeholder="turkana" required />
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label htmlFor="password" className="text-sm font-medium text-gray-700">
								Password
							</label>
							<Input id="password" name="password" type="password" autoComplete="new-password" required />
						</div>

						<div className="space-y-2">
							<label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
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

					<Button type="submit" fullWidth>
						Create account
					</Button>
				</form>
			</CardContent>

			<CardFooter className="text-center text-sm text-gray-600">
				<p>
					Already registered?{" "}
					<Link href="/login" className="font-semibold text-brand-700 hover:underline">
						Sign in
					</Link>
				</p>
			</CardFooter>
		</Card>
	);
}
