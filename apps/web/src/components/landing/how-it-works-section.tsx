/**
 * "How it works" — three steps. Each step is a small glassmorphic
 * card with a single editorial heading and a one-paragraph body.
 * The step numbers are oversized serif italic, set with a
 * negative-tracking display treatment, for an art-direction feel.
 */

"use client";

import { motion } from "motion/react";
import { Database, FolderOpen, PlayCircle } from "lucide-react";

const STEPS = [
	{
		icon: Database,
		title: "Drop your footage in",
		body: "Drag video, audio and image files straight onto the canvas. Artidor indexes them in your browser's storage — nothing uploads anywhere.",
		eyebrow: "Step 01",
	},
	{
		icon: FolderOpen,
		title: "Edit (or ask Arth)",
		body: "Use the timeline, the inspector, the keyboard — or describe the edit in the AI panel. Arth learns from your style as you work.",
		eyebrow: "Step 02",
	},
	{
		icon: PlayCircle,
		title: "Export to anything",
		body: "Render to MP4, WebM, or GIF. The Rust-side scene builder keeps export quality identical to the live preview, with the option to keep your audio mix.",
		eyebrow: "Step 03",
	},
];

export function HowItWorksSection() {
	return (
		<section className="relative mx-auto w-full max-w-7xl px-6 py-24 md:py-32">
			<div className="mb-12 max-w-2xl">
				<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/65 backdrop-blur">
					<PlayCircle className="size-3" />
					How it works
				</div>
				<h2 className="text-balance font-serif text-4xl font-medium italic leading-[1.05] tracking-[-0.01em] md:text-5xl">
					Three steps. No account.
					<span className="text-white/55"> No upload bar.</span>
				</h2>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				{STEPS.map((step, i) => (
					<motion.div
						key={step.title}
						initial={{ opacity: 0, y: 12 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-50px" }}
						transition={{ duration: 0.5, delay: i * 0.08 }}
						className="panel glass relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 p-6 backdrop-blur"
					>
						<div className="flex items-start justify-between">
							<span className="font-serif text-5xl font-medium italic leading-none tracking-[-0.04em] text-white/85 md:text-6xl">
								{String(i + 1).padStart(2, "0")}
							</span>
							<div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/85">
								<step.icon className="size-4" />
							</div>
						</div>
						<div>
							<div className="text-[10.5px] uppercase tracking-[0.18em] text-white/45">
								{step.eyebrow}
							</div>
							<h3 className="mt-2 text-[18px] font-semibold tracking-tight text-white">
								{step.title}
							</h3>
							<p className="mt-2 text-[13.5px] font-light leading-relaxed text-white/65">
								{step.body}
							</p>
						</div>
					</motion.div>
				))}
			</div>
		</section>
	);
}
