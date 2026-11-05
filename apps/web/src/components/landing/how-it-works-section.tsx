/**
 * "How it works" — Three Steps.
 *
 * Oversized halated italic serif numerals in a smoked-glass triptych.
 */

"use client";

import { motion } from "motion/react";
import { Database, FolderOpen, PlayCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STEPS = [
	{
		code: "01",
		icon: Database,
		titleKey: "home.howItWorks.steps.drop.title",
		bodyKey: "home.howItWorks.steps.drop.body",
		eyebrowKey: "home.howItWorks.steps.drop.eyebrow",
	},
	{
		code: "02",
		icon: FolderOpen,
		titleKey: "home.howItWorks.steps.edit.title",
		bodyKey: "home.howItWorks.steps.edit.body",
		eyebrowKey: "home.howItWorks.steps.edit.eyebrow",
	},
	{
		code: "03",
		icon: PlayCircle,
		titleKey: "home.howItWorks.steps.export.title",
		bodyKey: "home.howItWorks.steps.export.body",
		eyebrowKey: "home.howItWorks.steps.export.eyebrow",
	},
];

export function HowItWorksSection() {
	const { t } = useI18n();
	return (
		<section className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32">
			<div className="mb-14 max-w-2xl">
				<p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
					{t("home.howItWorks.eyebrow")}
				</p>
				<h2 className="halated-serif text-balance font-serif text-4xl font-normal italic leading-[1.04] tracking-[-0.02em] text-white sm:text-5xl md:text-[3.4rem]">
					{t("home.howItWorks.headline.line1")}
					<span className="text-white/60">
						{t("home.howItWorks.headline.line2")}
					</span>
				</h2>
			</div>

			<div className="prism-surface grid grid-cols-1 divide-y divide-white/[0.08] overflow-hidden rounded-2xl md:grid-cols-3 md:divide-x md:divide-y-0">
				{STEPS.map((step, i) => (
					<motion.div
						key={step.titleKey}
						initial={{ opacity: 0, y: 14 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-50px" }}
						transition={{ duration: 0.5, delay: i * 0.08 }}
						className="group relative flex flex-col justify-between gap-8 p-7 transition-colors hover:bg-white/[0.02] md:p-8"
					>
						<div
							aria-hidden
							className="prism-hairline pointer-events-none absolute inset-x-0 top-0 h-[1px] opacity-30 transition-opacity group-hover:opacity-90"
						/>
						<div className="flex items-start justify-between">
							<span className="halated-serif font-serif text-6xl font-normal italic leading-none tracking-[-0.04em] text-white/90 md:text-7xl">
								{step.code}
							</span>
							<div className="flex size-8 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white/80">
								<step.icon className="size-3.5" />
							</div>
						</div>

						<div>
							<div className="text-[10.5px] uppercase tracking-[0.18em] text-white/45">
								{t(step.eyebrowKey)}
							</div>
							<h3 className="mt-2 font-serif text-2xl font-normal italic tracking-[-0.01em] text-white">
								{t(step.titleKey)}
							</h3>
							<p className="mt-2.5 text-[13.5px] font-light leading-relaxed text-white/65">
								{t(step.bodyKey)}
							</p>
						</div>
					</motion.div>
				))}
			</div>
		</section>
	);
}
