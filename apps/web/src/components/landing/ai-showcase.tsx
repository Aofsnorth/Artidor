/**
 * Arth showcase section — the marquee feature for the new
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
import { useI18n } from "@/lib/i18n";

export function AIShowcaseSection() {
	const { t } = useI18n();
	return (
		<section
			id="ai-copilot"
			className="relative mx-auto w-full max-w-7xl px-6 py-24 md:py-32"
		>
			<div className="grid items-start gap-12 md:grid-cols-[1fr_1.15fr]">
				<div>
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/65 backdrop-blur">
						<Sparkles className="size-3 text-amber-200" />
						{t("home.aiShowcase.eyebrow")}
					</div>
					<h2 className="text-balance font-serif text-4xl font-medium italic leading-[1.05] tracking-[-0.01em] md:text-5xl">
						{t("home.aiShowcase.headline.line1")}
						<br />
						<span className="text-white/55">
							{t("home.aiShowcase.headline.line2")}
						</span>
					</h2>
					<p className="text-pretty mt-5 max-w-md text-[15px] font-light leading-relaxed text-white/65">
						{t("home.aiShowcase.body")}
					</p>

					<ul className="mt-8 flex flex-col gap-3 text-[13.5px] text-white/75">
						{[
							{
								icon: Scissors,
								titleKey: "home.aiShowcase.feature.selfImproving.title",
								bodyKey: "home.aiShowcase.feature.selfImproving.body",
							},
							{
								icon: Film,
								titleKey: "home.aiShowcase.feature.styleReference.title",
								bodyKey: "home.aiShowcase.feature.styleReference.body",
							},
							{
								icon: Sliders,
								titleKey: "home.aiShowcase.feature.tools.title",
								bodyKey: "home.aiShowcase.feature.tools.body",
							},
						].map((f) => (
							<li key={f.titleKey} className="flex items-start gap-3">
								<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-white/85">
									<f.icon className="size-3.5" />
								</span>
								<div>
									<div className="font-medium text-white">
										{t(f.titleKey)}
									</div>
									<div className="mt-0.5 text-white/55">
										{t(f.bodyKey)}
									</div>
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
	const { t } = useI18n();
	return (
		<div className="panel glass-strong relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.7)]">
			{/* Window chrome */}
			<div className="flex h-9 items-center gap-1.5 border-b border-white/10 bg-white/[0.02] px-3">
				<span className="size-2.5 rounded-full bg-[#ff5f57]/70" />
				<span className="size-2.5 rounded-full bg-[#febc2e]/70" />
				<span className="size-2.5 rounded-full bg-[#28c840]/70" />
				<div className="ml-4 flex items-center gap-1.5 text-[10.5px] text-white/50">
					<Command className="size-3" />
					{t("home.aiShowcase.chat.windowTitle")}
				</div>
				<div className="ml-auto flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9.5px] text-white/55">
					<Sparkles className="size-2.5 text-amber-200" />
					{t("home.aiShowcase.chat.liveBadge")}
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
					{t("home.aiShowcase.chat.userPrompt")}
				</motion.div>

				{/* AI thinking + reply */}
				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 0.4 }}
					className="flex w-full flex-col gap-2 self-start"
				>
					<div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] leading-relaxed text-white/90">
						{t("home.aiShowcase.chat.aiReply")}
					</div>

					{/* Tool call cards */}
					<div className="flex w-full min-w-0 flex-col gap-1.5">
						{[
							{
								icon: Scissors,
								nameKey: "home.aiShowcase.chat.toolName.split",
								detailKey: "home.aiShowcase.chat.toolDetail.split",
							},
							{
								icon: Mic,
								nameKey: "home.aiShowcase.chat.toolName.transcribe",
								detailKey: "home.aiShowcase.chat.toolDetail.transcribe",
							},
							{
								icon: Sliders,
								nameKey: "home.aiShowcase.chat.toolName.keyframe",
								detailKey: "home.aiShowcase.chat.toolDetail.keyframe",
							},
							{
								icon: Video,
								nameKey: "home.aiShowcase.chat.toolName.update",
								detailKey: "home.aiShowcase.chat.toolDetail.update",
							},
						].map((tool, i) => (
							<motion.div
								key={tool.nameKey}
								initial={{ opacity: 0, x: -4 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.3, delay: 0.7 + i * 0.18 }}
								className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-[11.5px] text-white/75"
							>
								<tool.icon className="size-3.5 shrink-0 text-white/55" />
								<span className="shrink-0 font-mono text-white">
									{t(tool.nameKey)}
								</span>
								<span className="shrink-0 text-white/35">·</span>
								<span className="min-w-0 truncate text-white/55">
									{t(tool.detailKey)}
								</span>
								<span className="ml-auto shrink-0 text-[10px] text-emerald-300/85">
									{t("home.aiShowcase.chat.toolStatus")}
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
					{t("home.aiShowcase.chat.followUp")}
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 2.1 }}
					className="flex max-w-[88%] flex-col gap-2 self-start"
				>
					<div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] leading-relaxed text-white/90">
						{t("home.aiShowcase.chat.aiReply2")}
					</div>
					<div className="flex items-center gap-1.5 text-[10.5px] text-white/55">
						<Sparkles className="size-3 text-amber-200" />
						{t("home.aiShowcase.chat.styleProfile")}
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
						{t("home.aiShowcase.chat.composerPlaceholder")}
					</span>
					<span className="ml-auto flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-[#0a0a0c]">
						{t("home.aiShowcase.chat.sendButton")}
						<ArrowRight className="size-3" />
					</span>
				</motion.div>
			</div>
		</div>
	);
}
