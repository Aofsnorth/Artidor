"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

interface SubsystemSpec {
	id: string;
	number: string;
	code: string;
	titleKey: string;
	bodyKey: string;
	metrics: string[];
}

const SUBSYSTEMS: SubsystemSpec[] = [
	{
		id: "item-0",
		number: "01",
		code: "INGEST / OPFS + WEBCODECS",
		titleKey: "home.features.card.localFirst.title",
		bodyKey: "home.features.card.localFirst.body",
		metrics: ["Zero server uploads", "Hardware frame decode", "GOP index cache"],
	},
	{
		id: "item-1",
		number: "02",
		code: "RUNTIME / RUST + WASM + TAURI",
		titleKey: "home.features.card.platforms.title",
		bodyKey: "home.features.card.platforms.body",
		metrics: ["Shared Rust crates", "Browser WASM target", "Localhost MCP server"],
	},
	{
		id: "item-2",
		number: "03",
		code: "INTELLIGENCE / OLLAMA + BYOK",
		titleKey: "home.features.card.aiControl.title",
		bodyKey: "home.features.card.aiControl.body",
		metrics: ["Local Ollama default", "AES-GCM key encryption", "77+ typed tools"],
	},
	{
		id: "item-3",
		number: "04",
		code: "RENDER / WEBGPU + 90+ WGSL SHADERS",
		titleKey: "home.features.card.gpu.title",
		bodyKey: "home.features.card.gpu.body",
		metrics: ["wgpu effect pipeline", "JFA SDF mask feather", "Real-time color wheels"],
	},
	{
		id: "item-4",
		number: "05",
		code: "TIMELINE / MULTI-TRACK & BEZIER",
		titleKey: "home.features.card.compositing.title",
		bodyKey: "home.features.card.compositing.body",
		metrics: ["Cubic-bezier graph editor", "75+ vector shapes", "Audio beat detection"],
	},
	{
		id: "item-5",
		number: "06",
		code: "PERSISTENCE / COMMAND LOG & .ARTPR",
		titleKey: "home.features.card.autosave.title",
		bodyKey: "home.features.card.autosave.body",
		metrics: ["Deterministic undo/redo", "IndexedDB + OPFS recovery", "Portable .artpr archive"],
	},
];

const COMPARISON_ROWS = [
	{
		dimension: "Media Residency",
		artidor: "100% Local Disk / OPFS",
		cloud: "Mandatory Cloud Upload",
	},
	{
		dimension: "Effects & Shaders",
		artidor: "90+ WGSL Shaders Included",
		cloud: "Paywalled Behind 'Pro' Tier",
	},
	{
		dimension: "AI Co-Pilot Routing",
		artidor: "Local Ollama or Your API Key",
		cloud: "Proprietary Credit Metering",
	},
	{
		dimension: "Export Watermark",
		artidor: "Never (MIT Licensed)",
		cloud: "Watermarked on Free Plan",
	},
];

export function FeaturesSection() {
	const { t } = useI18n();

	return (
		<section
			id="features"
			aria-labelledby="features-heading"
			className="relative mx-auto w-full max-w-7xl border-b border-[#141413]/15 px-4 py-20 sm:px-6 md:py-28 lg:px-8"
		>
			{/* Asymmetric 12-column Specification Ledger (replaces generic 3x2 icon card grid) */}
			<div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
				{/* Left Column: Sticky Section Thesis + Comparison Scorecard */}
				<div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:col-span-5">
					<div className="flex items-center gap-3">
						<span className="ed-rule" aria-hidden="true" />
						<span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#4A4741]">
							{t("home.features.eyebrow")}
						</span>
					</div>

					<h2
						id="features-heading"
						className="font-serif text-[clamp(2.1rem,4.1vw,3.5rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[#141413]"
					>
						<span>{t("home.features.headline.line1")}</span>
						<span className="italic text-[#282725]">
							{t("home.features.headline.line2")}
						</span>
					</h2>

					<p className="max-w-[50ch] text-[15px] leading-[1.65] text-[#282725]">
						{t("home.features.body")}
					</p>

					{/* Architectural Comparison Table */}
					<Card variant="editorial" className="mt-2 overflow-hidden">
						<div className="border-b border-[#141413]/15 bg-[#EAE7DF] px-4 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#141413]">
							VERIFIED ARCHITECTURE COMPARISON
						</div>
						<div className="divide-y divide-[#141413]/12 text-[12.5px]">
							{COMPARISON_ROWS.map((row) => (
								<div
									key={row.dimension}
									className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[1fr_1.1fr]"
								>
									<div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#4A4741]">
										{row.dimension}
									</div>
									<div className="flex flex-col gap-0.5">
										<span className="font-semibold text-[#141413]">
											Artidor: {row.artidor}
										</span>
										<span className="text-[11.5px] text-[#4A4741] line-through">
											Cloud NLE: {row.cloud}
										</span>
									</div>
								</div>
							))}
						</div>
					</Card>
				</div>

				{/* Right Column: Interactive Numbered Specification Ledger built on shadcn Accordion */}
				<div className="lg:col-span-7">
					<Card variant="editorial-raised" className="overflow-hidden">
						<div className="flex items-center justify-between border-b border-[#141413]/18 bg-[#DFDCD4] px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.15em] text-[#4A4741]">
							<span>SUBSYSTEM SPECIFICATION INDEX</span>
							<span>01 — 06 / MIT CORE</span>
						</div>

						<Accordion
							type="single"
							collapsible
							defaultValue="item-0"
							className="divide-y divide-[#141413]/15"
						>
							{SUBSYSTEMS.map((sub) => (
								<AccordionItem
									key={sub.id}
									value={sub.id}
									className="border-b-0 px-5 transition-colors data-[state=open]:bg-[#F4F1EA]/70"
								>
									<AccordionTrigger className="min-h-16 py-5 hover:no-underline">
										<div className="grid w-full grid-cols-[2.75rem_1fr] items-baseline gap-3 pr-4 text-left sm:grid-cols-[3.5rem_1fr]">
											<span className="font-serif text-2xl italic leading-none text-[#141413] sm:text-3xl">
												{sub.number}
											</span>
											<div className="flex flex-col gap-1">
												<span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#4A4741]">
													{sub.code}
												</span>
												<span className="text-[17px] font-semibold tracking-[-0.015em] text-[#141413] sm:text-[18px]">
													{t(sub.titleKey)}
												</span>
											</div>
										</div>
									</AccordionTrigger>
									<AccordionContent className="pb-6 pl-11 sm:pl-14">
										<p className="max-w-[58ch] text-[14.5px] leading-[1.65] text-[#282725]">
											{t(sub.bodyKey)}
										</p>
										<div className="mt-4 flex flex-wrap gap-2">
											{sub.metrics.map((m) => (
												<Badge key={m} variant="editorial">
													{m}
												</Badge>
											))}
										</div>
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</Card>
				</div>
			</div>
		</section>
	);
}
