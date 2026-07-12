/**
 * The new landing hero. Editorial typography + a real screenshot of
 * the running editor, framed by slow radial color washes.
 *
 * Layout:
 *   - Centered editorial lockup (eyebrow, headline, body, CTAs).
 *   - The actual editor screenshot (captured by
 *     `bun run scripts/capture-editor-screenshot.ts`) inside a
 *     glassmorphic frame.
 *   - Animated stat strip — GitHub stars come from the live repo
 *     via `useGitHubRepo`, the rest are constants.
 *
 * The "live preview" is a real PNG of the app, not a JSX mockup.
 * Visitors who click through to /editor see the same UI.
 */

"use client";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Command, Sparkles, Star } from "lucide-react";
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
	// Live star count from GitHub for the stats strip below; falls back to the
	// "40k+" placeholder until the first fetch resolves.
	const starsLabel = repoStats?.stars ?? "40k+";
	return (
		<section className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center px-6 pt-12 pb-16 text-center md:pt-20">
			<motion.div
				{...enter}
				transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
				className="mx-auto flex w-full max-w-5xl flex-col items-center"
			>
				<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur">
					<span className="relative flex size-1.5">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
						<span className="relative inline-flex size-1.5 rounded-full bg-emerald-300" />
					</span>
					{t("home.hero.eyebrow.primary")}
					<span className="text-white/30">·</span>
					<span className="text-white/55">
						{t("home.hero.eyebrow.secondary")}
					</span>
				</div>

				{/* leading-[1.15] + pb give the italic serif descenders (y, p, g)
				   room so bg-clip-text doesn't shear them off. "respects" gets a
				   bright silver gradient + a soft dreamy glow; it starts near-white
				   so it blends seamlessly with the white text on either side. */}
				<h1 className="text-balance pb-[0.12em] font-serif text-5xl font-medium italic leading-[1.15] tracking-[-0.02em] md:text-7xl lg:text-[5.5rem]">
					<span className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">
						{t("home.hero.headline.line1")}
						<br />
						{t("home.hero.headline.line2")}{" "}
					</span>
					<span className="bg-gradient-to-b from-[#ffffff] via-[#d7dee9] to-[#9aa7ba] bg-clip-text text-transparent [filter:drop-shadow(0_0_24px_rgba(214,224,240,0.55))_drop-shadow(0_0_9px_rgba(255,255,255,0.5))]">
						{t("home.hero.headline.highlight")}
					</span>
					<span className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">
						{" "}
						{t("home.hero.headline.line3")}
					</span>
				</h1>

				<p className="text-pretty mx-auto mt-7 max-w-2xl text-base font-light leading-relaxed tracking-wide text-white/65 md:text-lg">
					{t("home.hero.description")}
				</p>

				<div className="mt-9 flex flex-wrap items-center justify-center gap-3">
					<Link href="/projects" prefetch>
						<Button
							size="lg"
							className="h-11 rounded-full bg-white px-5 text-sm font-medium text-[#0a0a0c] shadow-[0_8px_30px_rgba(255,255,255,0.18)] hover:bg-white/90"
						>
							{t("home.hero.cta.openEditor")}
							<ArrowRight className="ml-1 size-4" />
						</Button>
					</Link>
					<Link href="https://github.com/Aofsnorth/Artidor" prefetch={false}>
						<Button
							size="lg"
							variant="outline"
							className="h-11 rounded-full border-white/15 bg-white/[0.04] px-5 text-sm font-medium text-white/90 backdrop-blur hover:bg-white/[0.08]"
						>
							<FaGithub className="mr-1.5 size-4" />
							{t("home.hero.cta.starGitHub")}
							<Star className="ml-1.5 size-3.5 text-amber-300" />
							{repoStats?.stars ? (
								<span className="ml-0.5 tabular-nums text-white/85">
									{repoStats.stars}
								</span>
							) : null}
						</Button>
					</Link>
				</div>

				{/* Real editor screenshot — captured from the live app via
				   `scripts/capture-editor-screenshot.ts`. Falls back to a
				   gradient placeholder until the asset is generated. */}
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
								<div className="font-serif text-2xl font-medium italic text-white md:text-3xl">
									{display}
								</div>
								<div className="text-[10.5px] uppercase tracking-[0.14em] text-white/45">
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
	// Real screenshot of the running editor, captured by
	// `bun run scripts/capture-editor-screenshot.ts`. Rendered inside
	// a glassmorphic frame so it looks intentional, not a flat
	// photo drop. The image is a fallback-rendered gradient until
	// the asset is generated by the script.
	return (
		<div className="panel glass-strong relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)]">
			{/* Top chrome — sits above the image so the user always
			   knows the screenshot is of the actual app, not a
			   marketing render. */}
			<div className="absolute inset-x-0 top-0 z-10 flex h-9 items-center gap-1.5 border-b border-white/10 bg-black/45 px-3 backdrop-blur">
				<span className="size-2.5 rounded-full bg-[#ff5f57]/70" />
				<span className="size-2.5 rounded-full bg-[#febc2e]/70" />
				<span className="size-2.5 rounded-full bg-[#28c840]/70" />
				<div className="ml-4 flex items-center gap-1.5 text-[10.5px] text-white/55">
					<Command className="size-3" />
					{t("home.hero.chrome.preview")}
				</div>
				<div className="ml-auto flex items-center gap-1 text-[10.5px] text-white/45">
					<Sparkles className="size-3 text-amber-200" />
					{t("home.hero.chrome.ai")}
				</div>
			</div>

			{/* Editor screenshot. The image is intentionally rendered
			   with `object-cover` so the screenshot can be any aspect
			   ratio and the frame still looks tight. We leave a 36px
			   top inset (h-9) so the chrome shows above the content
			   rather than overlapping it. */}
			<Image
				src={EDITOR_PREVIEW_SRC}
				alt={t("home.hero.imageAlt")}
				fill
				sizes="(min-width: 1024px) 1024px, 100vw"
				className="object-cover object-top pt-9"
				priority
				unoptimized
			/>

			{/* Soft reflection at the bottom — sells the "screen
			   mounted in a chrome" feel. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent"
			/>
		</div>
	);
}
