/**
 * AI Co-Pilot showcase section — the marquee feature for the new
 * AI Edit panel. Built as a side-by-side: copy on the left, an
 * animated chat mockup on the right.
 *
 * No real API calls here — the right-hand panel is a pure-TSX
 * reproduction of a single "make a 60-second reel" exchange so
 * visitors see the workflow before signing in.
 */

"use client";

import { motion } from "motion/react";
import {
	ArrowRight,
	Command,
	Mic,
	Sparkles,
	Video,
	Sliders,
	Scissors,
	Film,
} from "lucide-react";

export function AIShowcaseSection() {
	return (
		<section
			id="ai-copilot"
			className="relative mx-auto w-full max-w-7xl px-6 py-24 md:py-32"
		>
			<div className="grid items-start gap-12 md:grid-cols-[1fr_1.15fr]">
				<div>
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/65 backdrop-blur">
						<Sparkles className="size-3 text-amber-200" />
						AI Co-Pilot
					</div>
					<h2 className="text-balance font-serif text-4xl font-medium italic leading-[1.05] tracking-[-0.01em] md:text-5xl">
						Edit in plain English.
						<br />
						<span className="text-white/55">The editor does the rest.</span>
					</h2>
					<p className="text-pretty mt-5 max-w-md text-[15px] font-light leading-relaxed text-white/65">
						Artidor&apos;s co-pilot speaks every command the editor speaks:
						split, trim, retime, keyframe, transition, color-grade, import,
						export. You describe the intent. It issues the tool calls.
					</p>

					<ul className="mt-8 flex flex-col gap-3 text-[13.5px] text-white/75">
						{[
							{
								icon: Scissors,
								title: "Self-improving",
								body: "Every cut, split, keyframe and effect you apply is logged. The co-pilot reads your last 20 edits and matches your pacing, easing, and pacing.",
							},
							{
								icon: Film,
								title: "Style from a reference",
								body: "Drop in a finished video. The extractor reads its cuts-per-minute, palette, motion energy and audio tempo, then imitates it on your timeline.",
							},
							{
								icon: Sliders,
								title: "40+ tools, one model",
								body: "Add tracks, change fps, drop captions, apply a cinematic grade, export to MP4 — all from the same chat box. The model picks the right tool for the job.",
							},
						].map((f) => (
							<li key={f.title} className="flex items-start gap-3">
								<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-white/85">
									<f.icon className="size-3.5" />
								</span>
								<div>
									<div className="font-medium text-white">{f.title}</div>
									<div className="mt-0.5 text-white/55">{f.body}</div>
								</div>
							</li>
						))}
					</ul>
				</div>

				<ChatMockup />
			</div>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/*                                Chat mockup                                 */
/* -------------------------------------------------------------------------- */

function ChatMockup() {
	return (
		<div className="panel glass-strong relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.7)]">
			{/* Window chrome */}
			<div className="flex h-9 items-center gap-1.5 border-b border-white/10 bg-white/[0.02] px-3">
				<span className="size-2.5 rounded-full bg-[#ff5f57]/70" />
				<span className="size-2.5 rounded-full bg-[#febc2e]/70" />
				<span className="size-2.5 rounded-full bg-[#28c840]/70" />
				<div className="ml-4 flex items-center gap-1.5 text-[10.5px] text-white/50">
					<Command className="size-3" />
					Artidor · AI Edit
				</div>
				<div className="ml-auto flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9.5px] text-white/55">
					<Sparkles className="size-2.5 text-amber-200" />
					live
				</div>
			</div>

			<div className="flex flex-col gap-3 p-4 md:p-5">
				{/* User prompt */}
				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4 }}
					className="ml-auto max-w-[85%] self-end rounded-2xl rounded-br-sm border border-white/12 bg-white/[0.07] px-3.5 py-2 text-[13px] text-white"
				>
					Make a 60-second reel. Trim the longest clip, add captions, drop in a
					beat-synced zoom on every cut.
				</motion.div>

				{/* AI thinking + reply */}
				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 0.4 }}
					className="flex flex-col gap-2 self-start"
				>
					<div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] leading-relaxed text-white/90">
						Got it. Trimming the long take, generating captions, then setting
						beat cuts at the strongest transients in the audio.
					</div>

					{/* Tool call cards */}
					<div className="flex max-w-[95%] flex-col gap-1.5">
						{[
							{
								icon: Scissors,
								name: "split_element",
								detail: "Long take @ 00:00:42",
							},
							{
								icon: Mic,
								name: "transcribe",
								detail: "Audio track · 47 segments",
							},
							{
								icon: Sliders,
								name: "upsert_keyframe",
								detail: "scale 1 → 1.08 at every cut",
							},
							{
								icon: Video,
								name: "update_element",
								detail: "Captions on 4 overlay tracks",
							},
						].map((tool, i) => (
							<motion.div
								key={tool.name}
								initial={{ opacity: 0, x: -4 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.3, delay: 0.7 + i * 0.18 }}
								className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-[11.5px] text-white/75"
							>
								<tool.icon className="size-3.5 text-white/55" />
								<span className="font-mono text-white">{tool.name}</span>
								<span className="text-white/35">·</span>
								<span className="truncate text-white/55">{tool.detail}</span>
								<span className="ml-auto text-[10px] text-emerald-300/85">
									ok
								</span>
							</motion.div>
						))}
					</div>
				</motion.div>

				{/* Follow-up */}
				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 1.7 }}
					className="ml-auto max-w-[80%] self-end rounded-2xl rounded-br-sm border border-white/12 bg-white/[0.07] px-3.5 py-2 text-[13px] text-white"
				>
					Now match the cut pacing of the reference video I attached earlier.
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 2.1 }}
					className="flex max-w-[88%] flex-col gap-2 self-start"
				>
					<div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] leading-relaxed text-white/90">
						Reference was 48 cpm, soft fades. Re-cutting at 47 cpm with 180 ms
						crossfades and the same 35% warm-tone lift.
					</div>
					<div className="flex items-center gap-1.5 text-[10.5px] text-white/55">
						<Sparkles className="size-3 text-amber-200" />
						Style profile applied: 48 cpm · 0.6s avg shot · warm grade
					</div>
				</motion.div>

				{/* Composer */}
				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 2.4 }}
					className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 backdrop-blur"
				>
					<Sparkles className="size-3.5 text-white/45" />
					<span className="text-[12px] text-white/45">
						Ask Artidor to edit, plan a motion graphic, or describe what you
						want…
					</span>
					<span className="ml-auto flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-[#0a0a0c]">
						Send
						<ArrowRight className="size-3" />
					</span>
				</motion.div>
			</div>
		</div>
	);
}
