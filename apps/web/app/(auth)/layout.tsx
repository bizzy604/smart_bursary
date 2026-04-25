import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";

const civicHighlights = [
	{ title: "Mobile-first applications", body: "Students apply, upload docs and check status from any phone." },
	{ title: "County-branded official PDFs", body: "Exports preserve every county's brand and legal references." },
	{ title: "AI-assisted reviews", body: "Reviewers get scored shortlists with a transparent audit trail." },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<main className="page-shell grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
			<section className="relative hidden overflow-hidden lg:block">
				<div
					aria-hidden
					className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-700 to-accent-700"
				/>
				<div
					aria-hidden
					className="absolute inset-0 opacity-30"
					style={{
						backgroundImage:
							"radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)",
						backgroundSize: "22px 22px",
					}}
				/>
				<div
					aria-hidden
					className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-accent-400/25 blur-3xl"
				/>
				<div
					aria-hidden
					className="absolute -right-24 bottom-0 h-[24rem] w-[24rem] rounded-full bg-brand-300/30 blur-3xl"
				/>

				<div className="relative flex h-full flex-col justify-between p-12 text-white">
					<div className="space-y-7">
						<div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-100 backdrop-blur">
							<ShieldCheck className="h-3.5 w-3.5" />
							County Education Fund
						</div>
						<h1 className="font-display text-[42px] font-semibold leading-[1.05] tracking-tight">
							Digital bursary delivery
							<br />
							<span className="text-accent-100">built for Kenyan counties</span>
						</h1>
						<p className="max-w-md text-[15px] leading-relaxed text-brand-50/90">
							KauntyBursary helps students apply quickly and gives county teams transparent,
							auditable, data-backed decision support — end to end.
						</p>
					</div>

					<ul className="grid gap-4 text-sm text-brand-50">
						{civicHighlights.map((highlight) => (
							<li key={highlight.title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
								<CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent-200" />
								<div>
									<p className="font-semibold text-white">{highlight.title}</p>
									<p className="mt-0.5 text-[13px] leading-relaxed text-brand-50/80">{highlight.body}</p>
								</div>
							</li>
						))}
					</ul>
				</div>
			</section>

			<section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
				<div className="w-full max-w-md space-y-6">
					<div className="space-y-2 text-center lg:text-left">
						<Link href="/login" className="inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-brand-900">
							<span
								aria-hidden
								className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-700 to-brand-900 text-[13px] font-bold text-white shadow-sm"
							>
								KB
							</span>
							KauntyBursary
						</Link>
						<p className="text-sm text-gray-500">Secure access for students and county staff.</p>
					</div>
					{children}
				</div>
			</section>
		</main>
	);
}
