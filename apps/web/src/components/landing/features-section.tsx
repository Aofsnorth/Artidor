/**
 * Core Features Bento Grid.
 *
 * Sculptural smoked-glass panels with subtle optical refraction and
 * editorial serif headings — zero artificial spec tags or HUD labels.
 */

"use client";

import { motion } from "motion/react";
import { Layers, Lock, Monitor, Sparkles, Workflow, Zap } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useI18n } from "@/lib/i18n";

interface Feature {
	span: string;
	icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
	titleKey: string;
	bodyKey: string;
	accent: string;
}

const FEATURES: Feature[] = [
	{
		span: "lg:col-span-2",
		icon: Lock,
		titleKey: "home.features.card.localFirst.title",
		bodyKey: "home.features.card.localFirst.body",
		accent: "from-cyan-400/20 via-sky-300/5 to-transparent",
	},
	{
		span: "lg:col-span-1",
		icon: Monitor,
		titleKey: "home.features.card.platforms.title",
		bodyKey: "home.features.card.platforms.body",
		accent: "from-white/15 via-white/5 to-transparent",
	},
	{
		span: "lg:col-span-1",
		icon: Sparkles,
		titleKey: "home.features.card.aiControl.title",
		bodyKey: "home.features.card.aiControl.body",
		accent: "from-fuchsia-400/20 via-violet-400/5 to-transparent",
	},
	{
		span: "lg:col-span-2",
		icon: Zap,
		titleKey: "home.features.card.gpu.title",
		bodyKey: "home.features.card.gpu.body",
		accent: "from-amber-300/20 via-rose-400/5 to-transparent",
	},
	{
		span: "lg:col-span-1",
		icon: Layers,
		titleKey: "home.features.card.compositing.title",
		bodyKey: "home.features.card.compositing.body",
		accent: "from-emerald-300/20 via-teal-300/5 to-transparent",
	},
	{
		span: "lg:col-span-2",
		icon: Workflow,
		titleKey: "home.features.card.autosave.title",
		bodyKey: "home.features.card.autosave.body",
		accent: "from-sky-300/20 via-indigo-400/5 to-transparent",
	},
];

export function FeaturesSection() {
	const { t } = useI18n();
	return (
		<section
			id="features"
			className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32"
		>
			<div className="mb-14 grid items-end gap-6 lg:grid-cols-[1.2fr_0.8fr]">
				<div>
					<p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
						{t("home.features.eyebrow")}
					</p>
					<h2 className="halated-serif text-balance font-serif text-4xl font-normal italic leading-[1.04] tracking-[-0.02em] text-white sm:text-5xl md:text-[3.5rem]">
						{t("home.features.headline.line1")}
						<span className="text-white/60">
							{t("home.features.headline.line2")}
						</span>
					</h2>
				</div>
				<p className="text-pretty text-[15px] font-light leading-relaxed text-white/65 lg:pb-1">
					{t("home.features.body")}
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{FEATURES.map((f, i) => (
					<motion.div
						key={f.titleKey}
						initial={{ opacity: 0, y: 14 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-50px" }}
						transition={{ duration: 0.5, delay: i * 0.05 }}
						className={`prism-surface group relative flex flex-col justify-between overflow-hidden rounded-2xl p-7 ${f.span}`}
					>
						<div
							aria-hidden
							className="prism-hairline pointer-events-none absolute inset-x-0 top-0 h-[1px] opacity-25 transition-opacity duration-500 group-hover:opacity-90"
						/>
						<div
							aria-hidden
							className={`pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-gradient-to-br ${f.accent} blur-3xl opacity-40 transition-opacity duration-700 group-hover:opacity-90`}
						/>

						<div className="relative flex size-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white/85">
							<f.icon className="size-4" />
						</div>

						<div className="relative mt-6">
							<h3 className="font-serif text-2xl font-normal italic tracking-[-0.01em] text-white md:text-[1.6rem]">
								{t(f.titleKey)}
							</h3>
							<p className="mt-2.5 max-w-2xl text-[14px] font-light leading-relaxed text-white/65">
								{t(f.bodyKey)}
							</p>
						</div>
					</motion.div>
				))}
			</div>
		</section>
	);
}
