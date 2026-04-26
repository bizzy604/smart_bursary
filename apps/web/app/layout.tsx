import type { Metadata } from "next";
import { JetBrains_Mono, Oxanium, Playfair_Display } from "next/font/google";
import { AppSessionProvider } from "@/components/providers/session-provider";
import { PwaProvider } from "@/components/providers/pwa-provider";
import { Toaster } from "@/components/ui/toast";
import "../styles/globals.css";

const fontSans = Oxanium({
	subsets: ["latin"],
	variable: "--font-sans",
});

const fontSerif = Playfair_Display({
	subsets: ["latin"],
	variable: "--font-serif",
});

const fontMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: "KauntyBursary",
	description: "County bursary management portal for students and administrators.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}
		>
			<body className="font-sans antialiased">
				<AppSessionProvider>
					<PwaProvider>
						{children}
						<Toaster />
					</PwaProvider>
				</AppSessionProvider>
			</body>
		</html>
	);
}
