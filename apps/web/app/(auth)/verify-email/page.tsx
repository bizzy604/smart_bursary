import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function VerifyEmailPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Verify your email</CardTitle>
				<CardDescription>
					Paste the verification token from your email to activate your account.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="token" className="text-sm font-medium text-foreground/90">
							Verification token
						</label>
						<Input id="token" name="token" placeholder="Enter token" required />
					</div>

					<Button type="submit" fullWidth>
						Verify email
					</Button>
				</form>
			</CardContent>

			<CardFooter className="space-y-2 text-center text-sm text-muted-foreground">
				<p>
					Did not receive email?{" "}
					<button type="button" className="font-semibold text-secondary hover:underline">
						Resend verification
					</button>
				</p>
				<Link href="/login" className="text-secondary hover:underline">
					Return to sign in
				</Link>
			</CardFooter>
		</Card>
	);
}
