import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

const civicHighlights = [
	{
		title: "Mobile-first applications",
		body: "Students apply, upload docs and check status from any phone.",
	},
	{
		title: "County-branded official PDFs",
		body: "Exports preserve every county's brand and legal references.",
	},
	{
		title: "AI-assisted reviews",
		body: "Reviewers get scored shortlists with a transparent audit trail.",
	},
];

export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<main className="page-shell grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
			<section className="relative hidden overflow-hidden lg:block">
				{/* Base gradient — primary → secondary → primary keeps the deep navy feel */}
				<div
					aria-hidden
					className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary"
				/>

				{/* Dot grid pattern */}
				<div
					aria-hidden
					className="absolute inset-0 opacity-25"
					style={{
						backgroundImage:
							"radial-gradient(circle at 1px 1px, rgba(255,255,255,0.22) 1px, transparent 0)",
						backgroundSize: "22px 22px",
					}}
				/>

				{/* Soft glow orbs (warm + cool) for depth */}
				<div
					aria-hidden
					className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-amber-400/25 blur-3xl"
				/>
				<div
					aria-hidden
					className="absolute -right-24 bottom-0 h-[24rem] w-[24rem] rounded-full bg-sky-400/20 blur-3xl"
				/>

				{/* Bottom vignette for footer legibility */}
				<div
					aria-hidden
					className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent"
				/>

				<div className="relative flex h-full flex-col justify-between gap-10 p-12 text-white">
					<div className="space-y-7">
						{/* Eyebrow badge */}
						<div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
							<ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
							County Education Fund
						</div>

						{/* Hero heading */}
						<h1 className="font-serif text-[44px] font-semibold leading-[1.05] tracking-tight text-white">
							Digital bursary delivery
							<br />
							<span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">
								built for Kenyan counties
							</span>
						</h1>

						{/* Body copy */}
						<p className="max-w-md text-[15px] leading-relaxed text-white/80">
							KauntyBursary helps students apply quickly and gives county teams
							transparent, auditable, data-backed decision support — end to end.
						</p>
					</div>

					<div className="space-y-6">
						{/* Highlight cards */}
						<ul className="grid gap-3">
							{civicHighlights.map((highlight) => (
								<li
									key={highlight.title}
									className="group flex items-start gap-3 rounded-xl border border-white/15 bg-white/[0.07] p-3.5 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/[0.1]"
								>
									<span
										aria-hidden
										className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-300/15 ring-1 ring-amber-300/40 transition group-hover:bg-amber-300/25"
									>
										<CheckCircle2 className="h-4 w-4 text-amber-300" />
									</span>
									<div>
										<p className="text-sm font-semibold text-white">
											{highlight.title}
										</p>
										<p className="mt-0.5 text-[13px] leading-relaxed text-white/70">
											{highlight.body}
										</p>
									</div>
								</li>
							))}
						</ul>

						{/* Footer */}
						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-[11px] text-white/60">
							<span className="inline-flex items-center gap-2 uppercase tracking-[0.18em]">
								<Sparkles className="h-3 w-3 text-amber-300" />
								© {new Date().getFullYear()} KauntyBursary
							</span>
							<span className="inline-flex items-center gap-1.5">
								<span
									aria-hidden
									className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]"
								/>
								All systems operational
							</span>
						</div>
					</div>
				</div>
			</section>

			<section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
				<div className="w-full max-w-md space-y-6">
					<div className="space-y-2 text-center lg:text-left">
						<Link
							href="/login"
							className="inline-flex items-center gap-2 font-serif text-xl font-semibold tracking-tight text-primary"
						>
							<span
								aria-hidden
								className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-secondary to-primary text-[13px] font-bold text-white shadow-sm"
							>
								KB
							</span>
							KauntyBursary
						</Link>
						<p className="text-sm text-muted-foreground">
							Secure access for students and county staff.
						</p>
					</div>
					{children}
				</div>
			</section>
		</main>
	);
}
