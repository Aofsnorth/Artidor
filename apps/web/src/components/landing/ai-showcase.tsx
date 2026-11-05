/**
 * Arth — AI Co-Pilot Showcase.
 *
 * Editorial split layout with halated serif typography on the left and
 * a smoked-glass chat preview over liquid dispersion on the right.
 */

"use client";

import { motion } from "motion/react";
import { ArrowRight, Mic, Video, Sliders, Scissors, Film } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CAPABILITIES = [
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
];

const TOOL_TRACE = [
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
];

export function AIShowcaseSection() {
	const { t } = useI18n();
	return (
		<section
			id="ai-copilot"
			className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32"
		>
			<div className="grid items-start gap-14 lg:grid-cols-[1fr_1.15fr]">
				<div>
					<p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
						{t("home.aiShowcase.eyebrow")}
					</p>

					<h2 className="halated-serif text-balance font-serif text-4xl font-normal italic leading-[1.04] tracking-[-0.02em] text-white sm:text-5xl md:text-[3.4rem]">
						{t("home.aiShowcase.headline.line1")}
						<br />
						<span className="text-white/60">
							{t("home.aiShowcase.headline.line2")}
						</span>
					</h2>

					<p className="text-pretty mt-5 max-w-lg text-[15.5px] font-light leading-relaxed text-white/68">
						{t("home.aiShowcase.body")}
					</p>

					<div className="mt-9 flex flex-col divide-y divide-white/[0.08] border-y border-white/[0.08]">
						{CAPABILITIES.map((f) => (
							<div key={f.titleKey} className="flex items-start gap-4 py-5">
								<span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/80">
									<f.icon className="size-3.5" />
								</span>
								<div>
									<h3 className="text-[15px] font-medium tracking-tight text-white">
										{t(f.titleKey)}
									</h3>
									<p className="mt-1 text-[13.5px] font-light leading-relaxed text-white/60">
										{t(f.bodyKey)}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>

				<ChatMockup />
			</div>
		</section>
	);
}

function ChatMockup() {
	const { t } = useI18n();
	return (
		<div className="prism-surface relative overflow-hidden rounded-2xl">
			<div
				aria-hidden
				className="prism-hairline pointer-events-none absolute inset-x-0 top-0 z-20 h-[1px]"
			/>

			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-22 mix-blend-screen"
				style={{
					backgroundImage: "url(/wallpaper/liquid-dispersion.jpg)",
				}}
			/>

			<div className="flex h-10 items-center gap-1.5 border-b border-white/[0.08] bg-[#040408]/80 px-4">
				<span className="size-2.5 rounded-full bg-white/20" />
				<span className="size-2.5 rounded-full bg-white/20" />
				<span className="size-2.5 rounded-full bg-white/20" />
				<span className="ml-3 text-[11px] text-white/55">
					{t("home.aiShowcase.chat.windowTitle")}
				</span>
			</div>

			<div className="flex flex-col gap-3.5 p-5 md:p-6">
				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4 }}
					className="ml-auto max-w-[85%] self-end rounded-2xl rounded-br-xs border border-white/12 bg-white/[0.07] px-4 py-2.5 text-[13px] leading-relaxed text-white"
				>
					{t("home.aiShowcase.chat.userPrompt")}
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 0.25 }}
					className="flex w-full flex-col gap-2 self-start"
				>
					<div className="max-w-[90%] rounded-2xl rounded-bl-xs border border-white/10 bg-[#05050a]/80 px-4 py-2.5 text-[13px] leading-relaxed text-white/90">
						{t("home.aiShowcase.chat.aiReply")}
					</div>

					<div className="flex w-full min-w-0 flex-col gap-1.5">
						{TOOL_TRACE.map((tool, i) => (
							<motion.div
								key={tool.nameKey}
								initial={{ opacity: 0, x: -4 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.3, delay: 0.45 + i * 0.12 }}
								className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-[#040409]/85 px-3 py-1.5 text-[11.5px] text-white/75"
							>
								<tool.icon className="size-3.5 shrink-0 text-white/55" />
								<span className="shrink-0 font-mono text-white">
									{t(tool.nameKey)}
								</span>
								<span className="shrink-0 text-white/30">·</span>
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

				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 1.0 }}
					className="ml-auto max-w-[82%] self-end rounded-2xl rounded-br-xs border border-white/12 bg-white/[0.07] px-4 py-2.5 text-[13px] text-white"
				>
					{t("home.aiShowcase.chat.followUp")}
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 4 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.4, delay: 1.25 }}
					className="flex max-w-[90%] flex-col gap-2 self-start"
				>
					<div className="rounded-2xl rounded-bl-xs border border-white/10 bg-[#05050a]/80 px-4 py-2.5 text-[13px] leading-relaxed text-white/90">
						{t("home.aiShowcase.chat.aiReply2")}
					</div>
					<div className="text-[11px] text-white/50">
						{t("home.aiShowcase.chat.styleProfile")}
					</div>
				</motion.div>

				<div className="mt-1 flex items-center gap-2.5 rounded-xl border border-white/12 bg-[#030307]/85 px-3.5 py-2.5 backdrop-blur-xl">
					<span className="truncate text-[12px] text-white/45">
						{t("home.aiShowcase.chat.composerPlaceholder")}
					</span>
					<span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-[10.5px] font-medium text-[#020204]">
						{t("home.aiShowcase.chat.sendButton")}
						<ArrowRight className="size-3" />
					</span>
				</div>
			</div>
		</div>
	);
}
