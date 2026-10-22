"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

const STEPS = [
	{
		number: "01",
		eyebrowKey: "home.howItWorks.steps.drop.eyebrow",
		titleKey: "home.howItWorks.steps.drop.title",
		bodyKey: "home.howItWorks.steps.drop.body",
		ioSpec: "IN: MP4 / MOV / MKV / WAV -> OPFS CACHE",
		offsetClass: "lg:pt-0",
	},
	{
		number: "02",
		eyebrowKey: "home.howItWorks.steps.edit.eyebrow",
		titleKey: "home.howItWorks.steps.edit.title",
		bodyKey: "home.howItWorks.steps.edit.body",
		ioSpec: "BUS: TIMELINE COMMANDS <-> ARTH MCP",
		offsetClass: "lg:pt-12",
	},
	{
		number: "03",
		eyebrowKey: "home.howItWorks.steps.export.eyebrow",
		titleKey: "home.howItWorks.steps.export.title",
		bodyKey: "home.howItWorks.steps.export.body",
		ioSpec: "OUT: WEBGPU COMPOSITOR -> WEBCODECS MP4",
		offsetClass: "lg:pt-24",
	},
];

export function HowItWorksSection() {
	const { t } = useI18n();

	return (
		<section
			aria-labelledby="how-it-works-heading"
			className="relative mx-auto w-full max-w-7xl border-b border-[#141413]/15 px-4 py-20 sm:px-6 md:py-28 lg:px-8"
		>
			<div className="mb-14 grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
				<div className="lg:col-span-7">
					<div className="mb-4 flex items-center gap-3">
						<span className="ed-rule" aria-hidden="true" />
						<span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#4A4741]">
							{t("home.howItWorks.eyebrow")}
						</span>
					</div>
					<h2
						id="how-it-works-heading"
						className="font-serif text-[clamp(2.1rem,4.1vw,3.5rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[#141413]"
					>
						<span>{t("home.howItWorks.headline.line1")}</span>
						<span className="italic text-[#282725]">
							{t("home.howItWorks.headline.line2")}
						</span>
					</h2>
				</div>

				<div className="flex flex-col items-start gap-2 lg:col-span-5 lg:items-end lg:text-right">
					<span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#4A4741]">
						SIGNAL FLOW: DISK -&gt; GPU -&gt; FILE
					</span>
					<span className="ed-rule" aria-hidden="true" />
				</div>
			</div>

			{/* Staggered Asymmetric Editorial Sequence (avoids uniform 3-card row) */}
			<ol className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
				{STEPS.map((step) => (
					<li
						key={step.number}
						className={`flex flex-col justify-between border-t-2 border-[#141413] pt-6 ${step.offsetClass}`}
					>
						<div>
							<div className="flex items-baseline justify-between gap-4">
								<span className="font-serif text-6xl font-normal italic leading-none tracking-[-0.04em] text-[#141413] sm:text-7xl">
									{step.number}
								</span>
								<Badge variant="editorial">{t(step.eyebrowKey)}</Badge>
							</div>

							<h3 className="mt-6 text-xl font-semibold tracking-[-0.015em] text-[#141413]">
								{t(step.titleKey)}
							</h3>

							<p className="mt-3 text-[14.5px] leading-[1.65] text-[#282725]">
								{t(step.bodyKey)}
							</p>
						</div>

						<div className="mt-8 border-t border-[#141413]/15 pt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#4A4741]">
							{step.ioSpec}
						</div>
					</li>
				))}
			</ol>
		</section>
	);
}
