/**
 * "How it works" — three steps. Each step is a small glassmorphic
 * card with a single editorial heading and a one-paragraph body.
 * The step numbers are oversized serif italic, set with a
 * negative-tracking display treatment, for an art-direction feel.
 */

"use client";

import { motion } from "motion/react";
import { Database, FolderOpen, PlayCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STEPS = [
	{
		icon: Database,
		titleKey: "home.howItWorks.steps.drop.title",
		bodyKey: "home.howItWorks.steps.drop.body",
		eyebrowKey: "home.howItWorks.steps.drop.eyebrow",
	},
	{
		icon: FolderOpen,
		titleKey: "home.howItWorks.steps.edit.title",
		bodyKey: "home.howItWorks.steps.edit.body",
		eyebrowKey: "home.howItWorks.steps.edit.eyebrow",
	},
	{
		icon: PlayCircle,
		titleKey: "home.howItWorks.steps.export.title",
		bodyKey: "home.howItWorks.steps.export.body",
		eyebrowKey: "home.howItWorks.steps.export.eyebrow",
	},
];

export function HowItWorksSection() {
	const { t } = useI18n();
	return (
		<section className="relative mx-auto w-full max-w-7xl px-6 py-24 md:py-32">
			<div className="mb-12 max-w-2xl">
				<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/65 backdrop-blur">
					<PlayCircle className="size-3" />
					{t("home.howItWorks.eyebrow")}
				</div>
				<h2 className="text-balance font-serif text-4xl font-medium italic leading-[1.05] tracking-[-0.01em] md:text-5xl">
					{t("home.howItWorks.headline.line1")}
					<span className="text-white/55">
						{t("home.howItWorks.headline.line2")}
					</span>
				</h2>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				{STEPS.map((step, i) => (
					<motion.div
						key={step.titleKey}
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
								{t(step.eyebrowKey)}
							</div>
							<h3 className="mt-2 text-[18px] font-semibold tracking-tight text-white">
								{t(step.titleKey)}
							</h3>
							<p className="mt-2 text-[13.5px] font-light leading-relaxed text-white/65">
								{t(step.bodyKey)}
							</p>
						</div>
					</motion.div>
				))}
			</div>
		</section>
	);
}
