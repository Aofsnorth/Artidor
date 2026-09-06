/** Landing introduction with the existing editor screenshot and live repo metrics. */

"use client";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useGitHubRepo } from "@/hooks/use-github-repo";
import { useI18n } from "@/lib/i18n";

export function Hero() {
	const { t } = useI18n();
	const reducedMotion = useReducedMotion();
	const { formatted: repoStats } = useGitHubRepo();
	// When the user prefers reduced motion, we skip the entrance
	// animations entirely — the page is just there.
	const enter = reducedMotion
		? { initial: false, animate: { opacity: 1, y: 0 } }
		: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };
	// Unavailable data must not look like a real repository metric.
	const starsLabel = repoStats?.stars ?? "…";
	return (
		<section className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center px-6 pt-12 pb-16 text-center md:pt-20">
			<motion.div
				{...enter}
				transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
				className="mx-auto flex w-full max-w-5xl flex-col items-center"
			>
				<p className="mb-6 text-sm font-medium text-white/70">
					{t("home.hero.eyebrow.primary")}
				</p>

				{/* Preserve the display face, without glow competing with the editor preview. */}
				<h1 className="text-balance pb-[0.12em] font-serif text-4xl font-medium leading-[1.2] tracking-[-0.02em] sm:text-5xl lg:text-7xl">
					<span className="text-white">
						{t("home.hero.headline.line1")}
						<br />
						{t("home.hero.headline.line2")}{" "}
					</span>
					<span className="text-white">
						{t("home.hero.headline.highlight")}
					</span>
					<span className="text-white">
						{" "}
						{t("home.hero.headline.line3")}
					</span>
				</h1>

				<p className="text-pretty mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
					{t("home.hero.description")}
				</p>

				<div className="mt-9 flex flex-wrap items-center justify-center gap-3">
					<Button asChild size="lg" className="h-11 px-5">
						<Link href="/projects" prefetch>
							{t("home.hero.cta.openEditor")}
							<ArrowRight aria-hidden="true" className="ml-1 size-4" />
						</Link>
					</Button>
					<Button asChild size="lg" variant="outline" className="h-11 border-white/15 bg-transparent px-5 text-white/90 hover:bg-white/5">
						<Link href="https://github.com/Aofsnorth/Artidor" prefetch={false}>
							<FaGithub className="mr-1.5 size-4" />
							{t("home.hero.cta.starGitHub")}
							<Star className="ml-1.5 size-3.5 text-amber-300" />
							{repoStats?.stars ? (
								<span className="ml-0.5 tabular-nums text-white/85">
									{repoStats.stars}
								</span>
							) : null}
						</Link>
					</Button>
				</div>

				{/* Real editor screenshot from the app's existing local asset. */}
				<motion.div
					{...enter}
					transition={{
						duration: 0.7,
						delay: 0.4,
						ease: [0.22, 0.61, 0.36, 1],
					}}
					className="mt-16 w-full max-w-5xl"
				>
					<HeroPreview />
				</motion.div>

				<motion.div
					{...enter}
					transition={{ duration: 0.5, delay: 0.5 }}
					className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-6 text-left md:grid-cols-4"
				>
					{STATS.map((s) => {
						const isStars = s.key === "stars";
						const display = isStars ? starsLabel : s.value;
						return (
							<div key={s.labelKey} className="flex flex-col gap-1">
								<div className="text-2xl font-medium tabular-nums text-white md:text-3xl">
									{display}
								</div>
								<div className="text-xs text-white/65">
									{t(s.labelKey)}
								</div>
							</div>
						);
					})}
				</motion.div>
			</motion.div>
		</section>
	);
}

const STATS = [
	{ key: "stars", labelKey: "home.hero.stat.stars" },
	{ value: "0", labelKey: "home.hero.stat.dollars" },
	{ value: "3", labelKey: "home.hero.stat.platforms" },
	{ value: "MIT", labelKey: "home.hero.stat.license" },
];

/* -------------------------------------------------------------------------- */
/*                              Editor preview                              */
/* -------------------------------------------------------------------------- */

const EDITOR_PREVIEW_SRC = "/editor-preview.png";

function HeroPreview() {
	const { t } = useI18n();
	// Keep the full screenshot visible; decorative window chrome hid editor controls.
	return (
		<div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/15 bg-card">
			<Image
				src={EDITOR_PREVIEW_SRC}
				alt={t("home.hero.imageAlt")}
				fill
				sizes="(min-width: 1024px) 1024px, 100vw"
				className="object-contain"
				priority
				unoptimized
			/>

		</div>
	);
}
