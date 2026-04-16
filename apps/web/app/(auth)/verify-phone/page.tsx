import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function VerifyPhonePage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Confirm phone OTP</CardTitle>
				<CardDescription>
					Enter the 6-digit code sent to your phone so SMS updates can be delivered.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="otp" className="text-sm font-medium text-gray-700">
							One-time password
						</label>
						<Input id="otp" name="otp" inputMode="numeric" pattern="[0-9]{6}" placeholder="847291" required />
					</div>

					<Button type="submit" fullWidth>
						Verify phone
					</Button>
				</form>
			</CardContent>

			<CardFooter className="space-y-2 text-center text-sm text-gray-600">
				<button type="button" className="font-semibold text-brand-700 hover:underline">
					Send new OTP
				</button>
				<Link href="/login" className="text-brand-700 hover:underline">
					Back to sign in
				</Link>
			</CardFooter>
		</Card>
	);
}
