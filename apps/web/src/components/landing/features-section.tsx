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
import { useI18n } from "@/lib/i18n";

interface Feature {
	icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
	titleKey: string;
	bodyKey: string;
	tone: "warm" | "cool" | "violet" | "neutral";
}

const FEATURES: Feature[] = [
	{
		icon: Lock,
		titleKey: "home.features.card.localFirst.title",
		bodyKey: "home.features.card.localFirst.body",
		tone: "cool",
	},
	{
		icon: Monitor,
		titleKey: "home.features.card.platforms.title",
		bodyKey: "home.features.card.platforms.body",
		tone: "neutral",
	},
	{
		icon: Sparkles,
		titleKey: "home.features.card.aiControl.title",
		bodyKey: "home.features.card.aiControl.body",
		tone: "violet",
	},
	{
		icon: Zap,
		titleKey: "home.features.card.gpu.title",
		bodyKey: "home.features.card.gpu.body",
		tone: "warm",
	},
	{
		icon: Layers,
		titleKey: "home.features.card.compositing.title",
		bodyKey: "home.features.card.compositing.body",
		tone: "neutral",
	},
	{
		icon: Workflow,
		titleKey: "home.features.card.autosave.title",
		bodyKey: "home.features.card.autosave.body",
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
	const { t } = useI18n();
	return (
		<section
			id="features"
			className="relative mx-auto w-full max-w-7xl px-6 py-24 md:py-32"
		>
			<div className="mb-12 max-w-2xl">
				<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/65 backdrop-blur">
					<Layers className="size-3" />
					{t("home.features.eyebrow")}
				</div>
				<h2 className="text-balance font-serif text-4xl font-medium italic leading-[1.05] tracking-[-0.01em] md:text-5xl">
					{t("home.features.headline.line1")}
					<span className="text-white/55">
						{t("home.features.headline.line2")}
					</span>
				</h2>
				<p className="text-pretty mt-4 text-[15px] font-light leading-relaxed text-white/65">
					{t("home.features.body")}
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{FEATURES.map((f, i) => (
					<motion.div
						key={f.titleKey}
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
									{t(f.titleKey)}
								</h3>
								<p className="mt-2 text-[13.5px] font-light leading-relaxed text-white/65">
									{t(f.bodyKey)}
								</p>
							</div>
						</div>
					</motion.div>
				))}
			</div>
		</section>
	);
}
