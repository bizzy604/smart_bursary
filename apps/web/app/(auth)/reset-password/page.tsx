import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Create a new password</CardTitle>
				<CardDescription>
					Enter your reset token and set a strong password for your account.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="token" className="text-sm font-medium text-gray-700">
							Reset token
						</label>
						<Input id="token" name="token" required />
					</div>

					<div className="space-y-2">
						<label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
							New password
						</label>
						<Input id="newPassword" name="new_password" type="password" autoComplete="new-password" required />
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

					<Button type="submit" fullWidth>
						Update password
					</Button>
				</form>
			</CardContent>

			<CardFooter className="text-center text-sm text-gray-600">
				<Link href="/login" className="font-semibold text-brand-700 hover:underline">
					Return to sign in
				</Link>
			</CardFooter>
		</Card>
	);
}
