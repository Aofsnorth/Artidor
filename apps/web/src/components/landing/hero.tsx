/**
 * Prismatic Editorial Hero.
 *
 * Pure optical restraint: monumental halated serif typography set over
 * a darkroom crystal prism dispersion field, framing the live running
 * editor and a clean 4-column editorial ledger. No pill badges, no fake
 * HUD telemetry, no artificial sci-fi labels.
 */

"use client";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useGitHubRepo } from "@/hooks/use-github-repo";
import { useI18n } from "@/lib/i18n";

const STATS = [
	{ key: "stars", labelKey: "home.hero.stat.stars" },
	{ value: "$0", labelKey: "home.hero.stat.dollars" },
	{ value: "3", labelKey: "home.hero.stat.platforms" },
	{ value: "MIT", labelKey: "home.hero.stat.license" },
];

export function Hero() {
	const { t } = useI18n();
	const reducedMotion = useReducedMotion();
	const { formatted: repoStats } = useGitHubRepo();
	const enter = reducedMotion
		? { initial: false, animate: { opacity: 1, y: 0 } }
		: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
	const starsLabel = repoStats?.stars ?? "···";

	return (
		<section className="relative overflow-hidden px-4 pt-16 pb-24 sm:px-6 md:pt-24 md:pb-32">
			<div className="mx-auto max-w-6xl">
				<div className="relative flex flex-col items-center text-center">
					{/* Crystalline Butterfly Prism Dispersion Field */}
					<div
						aria-hidden
						className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-[560px] w-[900px] -translate-x-1/2"
					>
						<div
							className="animate-prism-breathe absolute inset-0 bg-contain bg-center bg-no-repeat opacity-80 mix-blend-screen"
							style={{
								backgroundImage: "url(/wallpaper/prism-butterfly.jpg)",
								maskImage:
									"radial-gradient(ellipse 58% 55% at 50% 46%, black 22%, transparent 76%)",
								WebkitMaskImage:
									"radial-gradient(ellipse 58% 55% at 50% 46%, black 22%, transparent 76%)",
							}}
						/>
					</div>

					<motion.div
						{...enter}
						transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
						className="mx-auto flex w-full max-w-4xl flex-col items-center"
					>
						{/* Monumental Halated Serif Headline */}
						<h1 className="halated-display text-balance pb-[0.1em] font-serif text-5xl font-normal italic leading-[1.05] tracking-[-0.025em] text-white sm:text-6xl md:text-7xl lg:text-[5.75rem]">
							<span className="bg-gradient-to-b from-white via-white to-white/80 bg-clip-text text-transparent">
								{t("home.hero.headline.line1")}
								<br />
								{t("home.hero.headline.line2")}{" "}
							</span>
							<span className="bg-gradient-to-r from-white via-[#d8ecff] to-[#fde68a] bg-clip-text text-transparent">
								{t("home.hero.headline.highlight")}
							</span>
							<span className="bg-gradient-to-b from-white via-white to-white/80 bg-clip-text text-transparent">
								{" "}
								{t("home.hero.headline.line3")}
							</span>
						</h1>

						<p className="text-pretty mx-auto mt-7 max-w-2xl text-base font-light leading-relaxed tracking-wide text-white/70 md:text-[17.5px]">
							{t("home.hero.description")}
						</p>

						{/* Clean Editorial CTAs */}
						<div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
							<Link href="/projects" prefetch>
								<Button
									size="lg"
									className="h-12 rounded-full bg-white px-7 text-[14px] font-medium text-[#020204] shadow-[0_0_36px_rgba(255,255,255,0.28)] transition-all hover:bg-white/90"
								>
									{t("home.hero.cta.openEditor")}
									<ArrowRight className="ml-1.5 size-4" />
								</Button>
							</Link>
							<Link
								href="https://github.com/Aofsnorth/Artidor"
								prefetch={false}
							>
								<Button
									size="lg"
									variant="outline"
									className="h-12 rounded-full border-white/15 bg-white/[0.04] px-6 text-[14px] font-medium text-white backdrop-blur-xl transition-all hover:border-white/30 hover:bg-white/[0.08]"
								>
									<HugeiconsIcon icon={GithubIcon} className="mr-2 size-4" />
									{t("home.hero.cta.starGitHub")}
									<Star className="ml-2 size-3.5 text-amber-300" />
									{repoStats?.stars ? (
										<span className="ml-1 tabular-nums text-white/85">
											{repoStats.stars}
										</span>
									) : null}
								</Button>
							</Link>
						</div>
					</motion.div>

					{/* Running Editor Frame */}
					<motion.div
						{...enter}
						transition={{
							duration: 0.75,
							delay: 0.2,
							ease: [0.22, 0.61, 0.36, 1],
						}}
						className="mt-16 w-full max-w-6xl"
					>
						<HeroPreview />
					</motion.div>

					{/* Quiet Editorial Stat Ledger */}
					<motion.div
						{...enter}
						transition={{ duration: 0.55, delay: 0.3 }}
						className="mt-16 grid w-full max-w-4xl grid-cols-2 gap-8 border-t border-white/[0.08] pt-10 text-left md:grid-cols-4"
					>
						{STATS.map((s) => {
							const display = "value" in s ? s.value : starsLabel;
							return (
								<div key={s.labelKey} className="flex flex-col gap-1.5">
									<div className="halated-serif font-serif text-3xl font-normal italic tracking-[-0.02em] text-white md:text-4xl">
										{display}
									</div>
									<div className="text-[11px] uppercase tracking-[0.14em] text-white/50">
										{t(s.labelKey)}
									</div>
								</div>
							);
						})}
					</motion.div>
				</div>
			</div>
		</section>
	);
}

const EDITOR_PREVIEW_SRC = "/editor-preview.png";

function HeroPreview() {
	const { t } = useI18n();
	return (
		<div className="prism-surface relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
			<div
				aria-hidden
				className="prism-hairline pointer-events-none absolute inset-x-0 top-0 z-20 h-[1px]"
			/>

			<div className="absolute inset-x-0 top-0 z-10 flex h-9 items-center gap-1.5 border-b border-white/[0.08] bg-[#030306]/80 px-3.5 backdrop-blur-xl">
				<span className="size-2.5 rounded-full bg-white/20" />
				<span className="size-2.5 rounded-full bg-white/20" />
				<span className="size-2.5 rounded-full bg-white/20" />
				<span className="ml-3 text-[11px] text-white/50">
					{t("home.hero.chrome.preview")}
				</span>
			</div>

			<Image
				src={EDITOR_PREVIEW_SRC}
				alt={t("home.hero.imageAlt")}
				fill
				sizes="(min-width: 1280px) 1152px, 100vw"
				className="object-cover object-top pt-9"
				priority
				unoptimized
			/>

			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#020204]/70 to-transparent"
			/>
		</div>
	);
}
