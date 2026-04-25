import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "../styles/globals.css";

const display = Plus_Jakarta_Sans({
	subsets: ["latin"],
	variable: "--font-display",
});

const body = Noto_Sans({
	subsets: ["latin"],
	variable: "--font-body",
});

const mono = JetBrains_Mono({
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
		<html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
			<body className="font-body text-gray-900 antialiased">
        {children}
        <Toaster />
      </body>
		</html>
	);
}
