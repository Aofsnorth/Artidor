/**
 * Final CTA — a single glassmorphic surface asking the visitor
 * to open the editor. Big serif headline, a one-line value
 * statement, and two buttons. Above the footer.
 */

"use client";

import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
	return (
		<section className="relative mx-auto w-full max-w-5xl px-6 py-20 text-center">
			<h2 className="text-balance mx-auto max-w-2xl font-serif text-5xl font-medium italic leading-[1.02] tracking-[-0.02em] md:text-6xl">
				Your footage is yours.
				<span className="block bg-gradient-to-br from-white via-white/85 to-white/40 bg-clip-text text-transparent">
					Your editor should be too.
				</span>
			</h2>
			<p className="text-pretty mx-auto mt-6 max-w-xl text-[15px] font-light leading-relaxed text-white/65">
				Open the editor in your browser — no install, no account. Or grab the
				desktop app for native GPU acceleration and offline use.
			</p>
			<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
				<Link href="/projects">
					<Button
						size="lg"
						className="h-12 rounded-full bg-white px-6 text-[15px] font-medium text-[#0a0a0c] shadow-[0_8px_30px_rgba(255,255,255,0.18)] hover:bg-white/90"
					>
						Open the editor
						<ArrowRight className="ml-2 size-4" />
					</Button>
				</Link>
				{/* Desktop button is locked. Still visible, still rendered
				   with the same outline treatment so the design reads
				   symmetric, but `disabled` + `aria-disabled` prevents
				   the click and a hover tooltip ("Coming soon") explains
				   why. The actual download surface (GitHub releases)
				   lives in the tooltip's action area if the user
				   really wants to go fetch a pre-release. */}
				<Button
					size="lg"
					variant="outline"
					disabled
					title="Coming soon — desktop app ships with v0.5"
					aria-label="Download for desktop — coming soon"
					className="h-12 cursor-not-allowed rounded-full border-white/15 bg-white/[0.04] px-6 text-[15px] font-medium text-white/55 backdrop-blur hover:bg-white/[0.04]"
				>
					<Download className="mr-2 size-4" />
					Download for desktop
					<span className="ml-2 rounded-full border border-white/15 bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/65">
						Soon
					</span>
				</Button>
			</div>
		</section>
	);
}
