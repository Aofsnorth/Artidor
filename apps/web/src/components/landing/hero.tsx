"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useGitHubRepo } from "@/hooks/use-github-repo";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/utils/ui";

const EDITOR_PREVIEW_SRC = "/editor-preview.png";

/**
 * Pixel-mosaic matrix coordinates modeled after the deconstructed portrait in
 * the visual reference poster (821761.jpg). Uses strictly the monochrome
 * warm-stone, slate-taupe, carbon-ink, and chalk-ivory palette.
 */
const MOSAIC_TILES: Array<{
	id: string;
	col: string;
	row: string;
	tone: "ink" | "charcoal" | "taupe" | "stone" | "ivory";
}> = [
	{ id: "t1", col: "col-start-2 col-span-2", row: "row-start-1", tone: "taupe" },
	{ id: "t2", col: "col-start-5 col-span-2", row: "row-start-1", tone: "ink" },
	{ id: "t3", col: "col-start-7 col-span-1", row: "row-start-1", tone: "ivory" },
	{ id: "t4", col: "col-start-9 col-span-2", row: "row-start-1", tone: "stone" },
	{ id: "t5", col: "col-start-1 col-span-1", row: "row-start-2", tone: "ink" },
	{ id: "t6", col: "col-start-3 col-span-2", row: "row-start-2", tone: "ivory" },
	{ id: "t7", col: "col-start-5 col-span-1", row: "row-start-2", tone: "charcoal" },
	{ id: "t8", col: "col-start-8 col-span-2", row: "row-start-2", tone: "ink" },
	{ id: "t9", col: "col-start-11 col-span-2", row: "row-start-2", tone: "taupe" },
	{ id: "t10", col: "col-start-2 col-span-1", row: "row-start-3", tone: "ivory" },
	{ id: "t11", col: "col-start-4 col-span-2", row: "row-start-3", tone: "ink" },
	{ id: "t12", col: "col-start-6 col-span-2", row: "row-start-3", tone: "stone" },
	{ id: "t13", col: "col-start-10 col-span-2", row: "row-start-3", tone: "ivory" },
	{ id: "t14", col: "col-start-12 col-span-1", row: "row-start-3", tone: "ink" },
];

const TONE_CLASS: Record<
	(typeof MOSAIC_TILES)[number]["tone"],
	string
> = {
	ink: "bg-[#141413]",
	charcoal: "bg-[#282725]",
	taupe: "bg-[#66625A]",
	stone: "bg-[#B7B1A5]",
	ivory: "bg-[#F4F1EA]",
};

const STATS = [
	{ key: "stars", labelKey: "home.hero.stat.stars" },
	{ value: "$0", labelKey: "home.hero.stat.dollars" },
	{ value: "3", labelKey: "home.hero.stat.platforms" },
	{ value: "MIT", labelKey: "home.hero.stat.license" },
] as const;

export function Hero() {
	const { t } = useI18n();
	const { formatted: repoStats } = useGitHubRepo();
	const starsLabel = repoStats?.stars ?? "40k+";

	return (
		<section
			aria-labelledby="hero-heading"
			className="relative mx-auto w-full max-w-7xl border-b border-[#141413]/15 px-4 pb-16 pt-8 sm:px-6 md:pb-24 md:pt-14 lg:px-8"
		>
			{/* Asymmetric 12-column Swiss-humanist poster layout */}
			<div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
				{/* Left Column: Marginalia, Wireframe Globe, and Monumental Two-Tone Serif Thesis */}
				<div className="flex flex-col justify-between lg:col-span-5 lg:min-h-[640px]">
					{/* Top-left marginalia block matching reference poster */}
					<div className="flex flex-col gap-6">
						<div className="flex flex-col gap-3">
							<p className="max-w-[26ch] font-mono text-[11px] font-medium uppercase leading-[1.45] tracking-[0.16em] text-[#141413]">
								{t("home.hero.marginalia.top")}
							</p>
							<span className="ed-rule" aria-hidden="true" />
						</div>

						{/* Minimalist wireframe globe emblem from the poster reference */}
						<div className="py-1" aria-hidden="true">
							<svg
								width="36"
								height="36"
								viewBox="0 0 36 36"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="text-[#141413]"
								aria-hidden="true"
							>
								<title>Artidor globe emblem</title>
								<circle
									cx="18"
									cy="18"
									r="16.5"
									stroke="currentColor"
									strokeWidth="1.1"
								/>
								<ellipse
									cx="18"
									cy="18"
									rx="8.5"
									ry="16.5"
									stroke="currentColor"
									strokeWidth="1.1"
								/>
								<line
									x1="1.5"
									y1="18"
									x2="34.5"
									y2="18"
									stroke="currentColor"
									strokeWidth="1.1"
								/>
								<path
									d="M4 11.5H32M4 24.5H32"
									stroke="currentColor"
									strokeWidth="1.1"
								/>
								<line
									x1="18"
									y1="1.5"
									x2="18"
									y2="34.5"
									stroke="currentColor"
									strokeWidth="1.1"
								/>
							</svg>
						</div>

						<div className="flex flex-col gap-4">
							<p className="max-w-[24ch] font-mono text-[11px] uppercase leading-[1.45] tracking-[0.14em] text-[#4A4741]">
								{t("home.hero.marginalia.mid1")}
							</p>
							<p className="max-w-[24ch] font-mono text-[11px] uppercase leading-[1.45] tracking-[0.14em] text-[#4A4741]">
								{t("home.hero.marginalia.mid2")}
							</p>
							<span className="ed-rule" aria-hidden="true" />
						</div>
					</div>

					{/* Lower-left monumental serif display lockup (upright Roman + sweeping Italic) */}
					<div className="mt-8 lg:mt-12">
						<div className="mb-4 flex flex-wrap items-center gap-2">
							<Badge variant="editorial-ink">
								{t("home.hero.eyebrow.secondary")}
							</Badge>
							<Badge variant="editorial">
								{t("home.hero.eyebrow.primary")}
							</Badge>
						</div>

						<h1
							id="hero-heading"
							className="font-serif text-[clamp(2.85rem,6.5vw,5.75rem)] font-normal leading-[0.95] tracking-[-0.03em] text-[#141413]"
						>
							<span className="block">{t("home.hero.headline.line1")}</span>
							<span className="block">{t("home.hero.headline.line2")}</span>
							<span className="mt-1 block italic font-normal text-[#141413]">
								{t("home.hero.headline.highlight")}{" "}
								{t("home.hero.headline.line3")}
							</span>
						</h1>

						<p className="mt-6 max-w-[54ch] text-[15.5px] leading-[1.65] text-[#282725]">
							{t("home.hero.description")}
						</p>

						<div className="mt-8 flex flex-wrap items-center gap-3">
							<Button asChild variant="editorial" size="editorial-lg">
								<Link href="/projects" prefetch>
									<span>{t("home.hero.cta.openEditor")}</span>
									<ArrowUpRight className="size-4" aria-hidden="true" />
								</Link>
							</Button>

							<Button asChild variant="editorial-outline" size="editorial-lg">
								<Link
									href="https://github.com/Aofsnorth/Artidor"
									prefetch={false}
									target="_blank"
									rel="noopener noreferrer"
								>
									<HugeiconsIcon icon={GithubIcon} className="size-4" />
									<span>{t("home.hero.cta.starGitHub")}</span>
									{repoStats?.stars ? (
										<span className="ml-1 rounded-[2px] border border-[#141413]/25 bg-[#D2CEC5] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-[#141413]">
											{repoStats.stars}
										</span>
									) : null}
								</Link>
							</Button>
						</div>
					</div>
				</div>

				{/* Right Column: Deconstructed Pixel-Mosaic + Live Editor Workbench */}
				<div className="flex flex-col justify-between gap-6 lg:col-span-7">
					<HeroWorkbenchPreview />

					{/* Bottom-left & Bottom-right marginalia footnotes mirroring the reference poster */}
					<div className="grid grid-cols-1 gap-6 border-t border-[#141413]/15 pt-6 sm:grid-cols-2">
						<div className="flex flex-col gap-2.5">
							<span className="ed-rule" aria-hidden="true" />
							<p className="max-w-[34ch] font-mono text-[10.5px] uppercase leading-[1.5] tracking-[0.14em] text-[#4A4741]">
								{t("home.hero.marginalia.bottomLeft")}
							</p>
						</div>

						<div className="flex flex-col items-start gap-2.5 sm:items-end sm:text-right">
							<p className="max-w-[28ch] font-mono text-[10.5px] uppercase leading-[1.5] tracking-[0.14em] text-[#141413]">
								{t("home.hero.marginalia.bottomRight")}
							</p>
							<span className="ed-rule" aria-hidden="true" />
						</div>
					</div>
				</div>
			</div>

			{/* Architectural Telemetry Ledger Strip */}
			<div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-[#141413]/20 bg-[#141413]/15 shadow-beautiful-sm md:grid-cols-4">
				{STATS.map((s, idx) => {
					const display = "value" in s ? s.value : starsLabel;
					return (
						<div
							key={s.labelKey}
							className="flex flex-col justify-between gap-2 bg-[#DFDCD4] p-4 sm:p-5"
						>
							<div className="flex items-center justify-between">
								<span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#4A4741]">
									0{idx + 1} / METRIC
								</span>
								<span
									className="size-1.5 rounded-[1px] bg-[#141413]"
									aria-hidden="true"
								/>
							</div>
							<div className="font-serif text-3xl font-normal italic tracking-[-0.02em] tabular-nums text-[#141413] sm:text-4xl">
								{display}
							</div>
							<div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#4A4741]">
								{t(s.labelKey)}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

function HeroWorkbenchPreview() {
	const { t } = useI18n();
	const [viewMode, setViewMode] = useState<"workbench" | "architecture">(
		"workbench",
	);

	return (
		<div className="relative flex flex-col">
			{/* Top Pixel-Mosaic Deconstruction Header (echoing the square voxel grid of 821761.jpg) */}
			<div
				aria-hidden="true"
				className="grid h-16 w-full grid-cols-12 grid-rows-3 gap-1 pb-2"
			>
				{MOSAIC_TILES.map((tile) => (
					<div
						key={tile.id}
						className={cn(
							"rounded-[1px] transition-opacity duration-200",
							tile.col,
							tile.row,
							TONE_CLASS[tile.tone],
						)}
					/>
				))}
			</div>

			{/* Main Carbon-Ink Workbench Frame with MengTo beautiful-lg elevation */}
			<Card
				variant="editorial-ink"
				className="relative overflow-hidden rounded-[4px] border border-[#141413] bg-[#141413] p-2 sm:p-3 shadow-beautiful-lg"
			>
				{/* Technical Top Bar with Interactive Mode Toggle */}
				<div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#F4F1EA]/12 pb-2 px-1">
					<div className="flex items-center gap-2.5">
						<span
							className="size-2 rounded-[1px] bg-[#F4F1EA]"
							aria-hidden="true"
						/>
						<span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#F4F1EA]/85">
							{t("home.hero.chrome.preview")}
						</span>
					</div>

					<div
						role="toolbar"
						aria-label="Preview display mode"
						className="inline-flex items-center gap-1 rounded-[3px] border border-[#F4F1EA]/20 bg-[#282725] p-0.5"
					>
						<button
							type="button"
							onClick={() => setViewMode("workbench")}
							aria-pressed={viewMode === "workbench"}
							className={cn(
								"min-h-11 cursor-pointer rounded-[2px] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-[background-color,color,transform] duration-150 active:scale-[0.97]",
								viewMode === "workbench"
									? "bg-[#F4F1EA] text-[#141413] font-semibold"
									: "text-[#F4F1EA]/75 hover:text-[#F4F1EA]",
							)}
						>
							UI Canvas
						</button>
						<button
							type="button"
							onClick={() => setViewMode("architecture")}
							aria-pressed={viewMode === "architecture"}
							className={cn(
								"min-h-11 cursor-pointer rounded-[2px] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-[background-color,color,transform] duration-150 active:scale-[0.97]",
								viewMode === "architecture"
									? "bg-[#F4F1EA] text-[#141413] font-semibold"
									: "text-[#F4F1EA]/75 hover:text-[#F4F1EA]",
							)}
						>
							Pipeline Spec
						</button>
					</div>
				</div>

				{/* Viewport Content */}
				<div className="relative aspect-[16/10] w-full overflow-hidden rounded-[2px] border border-[#F4F1EA]/10 bg-[#0d0d0e]">
					<Image
						src={EDITOR_PREVIEW_SRC}
						alt={t("home.hero.imageAlt")}
						fill
						sizes="(min-width: 1024px) 720px, 100vw"
						className={cn(
							"object-cover object-top transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
							viewMode === "architecture" ? "opacity-25" : "opacity-100",
						)}
						priority
						unoptimized
					/>

					{/* Architectural Pixel-Grid Overlay on Right Edge (homage to 821761.jpg) */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-y-0 right-0 hidden w-20 grid-cols-2 grid-rows-8 gap-1 p-1.5 opacity-85 sm:grid"
					>
						<div className="col-start-2 row-start-1 bg-[#F4F1EA]/90" />
						<div className="col-start-1 row-start-2 bg-[#D2CEC5]/75" />
						<div className="col-start-2 row-start-3 bg-[#141413]/90 border border-[#F4F1EA]/25" />
						<div className="col-start-1 row-start-5 bg-[#F4F1EA]/80" />
						<div className="col-start-2 row-start-6 bg-[#66625A]/80" />
						<div className="col-start-2 row-start-8 bg-[#D2CEC5]/85" />
					</div>

					{/* Interactive Pipeline Specification Readout */}
					{viewMode === "architecture" && (
						<div className="absolute inset-0 flex flex-col justify-between bg-[#141413]/85 p-4 text-[#F4F1EA] sm:p-6">
							<div className="flex items-center justify-between border-b border-[#F4F1EA]/15 pb-3 font-mono text-[11px] uppercase tracking-[0.14em]">
								<span>LOCAL EXECUTION TOPOLOGY</span>
								<span>ZERO NETWORK I/O</span>
							</div>
							<div className="grid grid-cols-1 gap-3 my-auto sm:grid-cols-3">
								<div className="rounded-[3px] border border-[#F4F1EA]/20 bg-[#282725]/90 p-3.5">
									<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#D2CEC5]">
										01 / DECODE
									</div>
									<div className="mt-1 font-serif text-lg italic">
										WebCodecs + OPFS
									</div>
									<p className="mt-1.5 text-xs leading-relaxed text-[#EAE7DF]/80">
										Hardware video frames stream straight from browser disk
										cache into GPU textures.
									</p>
								</div>
								<div className="rounded-[3px] border border-[#F4F1EA]/20 bg-[#282725]/90 p-3.5">
									<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#D2CEC5]">
										02 / COMPOSITE
									</div>
									<div className="mt-1 font-serif text-lg italic">
										Rust WASM + wgpu
									</div>
									<p className="mt-1.5 text-xs leading-relaxed text-[#EAE7DF]/80">
										90+ WGSL shaders, JFA mask feathering, and bezier keyframe
										interpolation at 60fps.
									</p>
								</div>
								<div className="rounded-[3px] border border-[#F4F1EA]/20 bg-[#282725]/90 p-3.5">
									<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#D2CEC5]">
										03 / COMMAND
									</div>
									<div className="mt-1 font-serif text-lg italic">
										Arth MCP Bus
									</div>
									<p className="mt-1.5 text-xs leading-relaxed text-[#EAE7DF]/80">
										77+ schema-validated timeline tools callable by local Ollama
										or external MCP clients.
									</p>
								</div>
							</div>
							<div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F4F1EA]/15 pt-3 font-mono text-[10.5px] text-[#D2CEC5]">
								<span>MEM: OPFS SANDBOX</span>
								<span>SHADER PASS: 1.4MS</span>
								<span>LICENSE: MIT</span>
							</div>
						</div>
					)}
				</div>

				{/* Bottom Timecode & Subsystem Status Strip */}
				<div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#D2CEC5]">
					<span>TC 00:01:14:08 · 24.00 FPS</span>
					<span>{t("home.hero.chrome.ai")}</span>
				</div>
			</Card>
		</div>
	);
}
