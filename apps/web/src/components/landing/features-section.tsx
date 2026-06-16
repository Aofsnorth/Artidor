/**
 * Core features grid. Six cards, mixed sizing, glassmorphic. Built
 * around the four reasons people actually switch video editors
 * (privacy, cost, platform reach, no AI paywall) plus two capability
 * tiles that highlight what's possible in v1.
 */

"use client";

import { motion } from "motion/react";
import { Layers, Lock, Monitor, Sparkles, Workflow, Zap } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface Feature {
	icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
	title: string;
	body: string;
	tone: "warm" | "cool" | "violet" | "neutral";
}

const FEATURES: Feature[] = [
	{
		icon: Lock,
		title: "Local-first by design",
		body: "Your media never leaves the device. Footage, projects, and AI models all run in your browser via WebCodecs and the Rust core compiled to WASM.",
		tone: "cool",
	},
	{
		icon: Monitor,
		title: "Web · Desktop · API",
		body: "Same Rust core, three runtimes. Open a project in the browser, keep going on the desktop app, embed the editor in your own product via the API.",
		tone: "neutral",
	},
	{
		icon: Sparkles,
		title: "AI that you control",
		body: "The co-pilot speaks to a local LLM by default (Ollama). Wire up OpenAI or Anthropic if you want frontier models — your keys, your data, your rules.",
		tone: "violet",
	},
	{
		icon: Zap,
		title: "GPU-accelerated everywhere",
		body: "WebGPU compositor, wgpu-powered effects pipeline, and Rust-side feather for masks. The same primitives run on Apple Silicon, NVIDIA, and AMD.",
		tone: "warm",
	},
	{
		icon: Layers,
		title: "Compositing that doesn't fight you",
		body: "Layered scenes, blend modes, masks with feather, real keyframes, audio waveforms with beat detection. The toolkit CapCut hides behind a paywall — yours for free.",
		tone: "neutral",
	},
	{
		icon: Workflow,
		title: "Real undo, real autosave",
		body: "Command-based history with ripple editing, bookmarks, and per-scene state. Autosave runs against local IndexedDB or your own Postgres — no cloud lock-in.",
		tone: "cool",
	},
];

const TONE_RING: Record<Feature["tone"], string> = {
	warm: "from-amber-200/30 to-amber-100/0",
	cool: "from-sky-300/25 to-cyan-200/0",
	violet: "from-violet-300/30 to-fuchsia-200/0",
	neutral: "from-white/15 to-white/0",
};

export function FeaturesSection() {
	return (
		<section
			id="features"
			className="relative mx-auto w-full max-w-7xl px-6 py-24 md:py-32"
		>
			<div className="mb-12 max-w-2xl">
				<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/65 backdrop-blur">
					<Layers className="size-3" />
					What you get
				</div>
				<h2 className="text-balance font-serif text-4xl font-medium italic leading-[1.05] tracking-[-0.01em] md:text-5xl">
					The editor CapCut charges
					<span className="text-white/55"> for — yours for free.</span>
				</h2>
				<p className="text-pretty mt-4 text-[15px] font-light leading-relaxed text-white/65">
					Every feature below is in the public repo today. The co-pilot, the
					compositor, the masking system, the timeline, the autosave.
					MIT-licensed. Forks welcome.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{FEATURES.map((f, i) => (
					<motion.div
						key={f.title}
						initial={{ opacity: 0, y: 12 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-50px" }}
						transition={{ duration: 0.5, delay: i * 0.05 }}
						className="panel glass-strong group relative overflow-hidden rounded-2xl border border-white/10 p-6 backdrop-blur"
					>
						<div
							aria-hidden
							className={`absolute -right-12 -top-12 size-48 rounded-full bg-gradient-to-br ${TONE_RING[f.tone]} blur-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100`}
						/>
						<div className="relative flex flex-col gap-4">
							<div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/85">
								<f.icon className="size-4" />
							</div>
							<div>
								<h3 className="text-[15px] font-semibold tracking-tight text-white">
									{f.title}
								</h3>
								<p className="mt-2 text-[13.5px] font-light leading-relaxed text-white/65">
									{f.body}
								</p>
							</div>
						</div>
					</motion.div>
				))}
			</div>
		</section>
	);
}
