/**
 * Open-Source Pledge Section.
 *
 * Framed in iridescent blown-glass caustics (`/wallpaper/optical-caustics.jpg`)
 * with a clean 2x2 editorial ledger.
 */

"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useGitHubRepo } from "@/hooks/use-github-repo";
import { useI18n } from "@/lib/i18n";

const STATS: Array<{
	labelKey: string;
	value?: string;
	kind?: "stars" | "forks";
}> = [
	{ kind: "stars", labelKey: "home.pledge.stat.stars" },
	{ kind: "forks", labelKey: "home.pledge.stat.forks" },
	{ value: "MIT", labelKey: "home.pledge.stat.license" },
	{ value: "$0", labelKey: "home.pledge.stat.dollars" },
];

export function PledgeSection() {
	const { t } = useI18n();
	const { formatted: repoStats } = useGitHubRepo();
	const starsLabel = repoStats?.stars ?? "···";
	const forksLabel = repoStats?.forks ?? "···";

	return (
		<section className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32">
			<div className="prism-surface relative overflow-hidden rounded-3xl p-8 md:p-14">
				<div
					aria-hidden
					className="prism-hairline pointer-events-none absolute inset-x-0 top-0 h-[1px]"
				/>

				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-35 mix-blend-screen"
					style={{
						backgroundImage: "url(/wallpaper/optical-caustics.jpg)",
						maskImage:
							"radial-gradient(ellipse 75% 75% at 75% 50%, black 15%, transparent 80%)",
						WebkitMaskImage:
							"radial-gradient(ellipse 75% 75% at 75% 50%, black 15%, transparent 80%)",
					}}
				/>

				<div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
					<div>
						<p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/45">
							{t("home.pledge.eyebrow")}
						</p>

						<h2 className="halated-serif text-balance font-serif text-4xl font-normal italic leading-[1.04] tracking-[-0.02em] text-white sm:text-5xl md:text-[3.5rem]">
							{t("home.pledge.headline.line1")}
							<span className="text-white/60">
								{t("home.pledge.headline.line2")}
							</span>
						</h2>

						<p className="text-pretty mt-5 max-w-lg text-[15.5px] font-light leading-relaxed text-white/68">
							{t("home.pledge.body")}
						</p>

						<div className="mt-8 flex flex-wrap items-center gap-3.5">
							<Link
								href={`https://github.com/Aofsnorth/Artidor${
									repoStats?.stars
										? `?ref=artidor-web&stars=${repoStats.stars}`
										: ""
								}`}
							>
								<Button
									size="lg"
									className="h-12 rounded-full bg-white px-6 text-[13.5px] font-medium text-[#020204] shadow-[0_0_32px_rgba(255,255,255,0.25)] hover:bg-white/90"
								>
									<HugeiconsIcon icon={GithubIcon} className="mr-2 size-4" />
									{t("home.pledge.cta.starRepo")}
									<Star className="ml-2 size-3.5 text-amber-400" />
									{repoStats?.stars && (
										<span className="ml-1.5 rounded-full bg-black/10 px-2 py-0.5 font-mono text-[10.5px] text-[#020204]/85">
											{starsLabel}
										</span>
									)}
								</Button>
							</Link>
							<Link href="/projects">
								<Button
									size="lg"
									variant="outline"
									className="h-12 rounded-full border-white/15 bg-white/[0.04] px-6 text-[13.5px] font-medium text-white backdrop-blur hover:border-white/30 hover:bg-white/[0.08]"
								>
									{t("home.pledge.cta.openEditor")}
									<ArrowRight className="ml-1.5 size-4" />
								</Button>
							</Link>
						</div>
					</div>

					<div className="grid grid-cols-2 divide-x divide-y divide-white/[0.08] overflow-hidden rounded-2xl border border-white/10 bg-[#030307]/75 backdrop-blur-xl">
						{STATS.map((s, i) => (
							<motion.div
								key={s.labelKey}
								initial={{ opacity: 0, y: 8 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.4, delay: i * 0.06 }}
								className="flex flex-col justify-between gap-3 p-6"
							>
								<div className="halated-serif font-serif text-4xl font-normal italic tracking-[-0.02em] text-white md:text-5xl">
									{s.kind === "stars"
										? starsLabel
										: s.kind === "forks"
											? forksLabel
											: s.value}
								</div>
								<div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
									{t(s.labelKey)}
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
