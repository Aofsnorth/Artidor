/**
 * Open-source pledge section. Counts the things that matter for a
 * public project: stars, contributors, the license, and a single
 * CTA to the GitHub repo. Numbers are illustrative until the
 * release pipeline is wired up — they're rendered with a slow
 * counter so the section feels alive.
 */

"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, Github, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGitHubRepo } from "@/hooks/use-github-repo";

export function PledgeSection() {
	const { formatted: repoStats } = useGitHubRepo();
	// The star count is real-time; the rest are constants. We
	// render a placeholder until the first response lands.
	const starsLabel = repoStats?.stars ?? "···";
	const forksLabel = repoStats?.forks ?? "···";
	return (
		<section className="relative mx-auto w-full max-w-7xl px-6 py-24 md:py-32">
			<div className="panel glass-strong relative overflow-hidden rounded-3xl border border-white/10 p-8 backdrop-blur md:p-12">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 -z-10"
					style={{
						background:
							"radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.06), transparent 70%)",
					}}
				/>

				<div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
					<div>
						<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/65 backdrop-blur">
							<Heart className="size-3 text-rose-300" />
							Mit-licensed. Always.
						</div>
						<h2 className="text-balance font-serif text-4xl font-medium italic leading-[1.05] tracking-[-0.01em] md:text-5xl">
							No &quot;Pro&quot; tier.
							<span className="text-white/55"> No watermark. No expiry.</span>
						</h2>
						<p className="text-pretty mt-4 max-w-md text-[15px] font-light leading-relaxed text-white/65">
							Artidor is built in public. Every release ships with the full
							feature set unlocked. If we ever charge for anything, we build a
							paid product that doesn&apos;t touch the editor.
						</p>

						<div className="mt-7 flex flex-wrap items-center gap-3">
							<Link
								href={`https://github.com/Aofsnorth/Artidor${
									repoStats?.stars
										? `?ref=artidor-web&stars=${repoStats.stars}`
										: ""
								}`}
							>
								<Button
									size="lg"
									className="h-11 rounded-full bg-white px-5 text-sm font-medium text-[#0a0a0c] shadow-[0_8px_30px_rgba(255,255,255,0.18)] hover:bg-white/90"
								>
									<Github className="mr-1.5 size-4" />
									Star the repo
									<Star className="ml-1.5 size-3.5 text-amber-400" />
									{repoStats?.stars && (
										<span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 font-mono text-[10.5px] text-[#0a0a0c]/80">
											{starsLabel}
										</span>
									)}
								</Button>
							</Link>
							<Link href="/projects">
								<Button
									size="lg"
									variant="outline"
									className="h-11 rounded-full border-white/15 bg-white/[0.04] px-5 text-sm font-medium text-white/90 backdrop-blur hover:bg-white/[0.08]"
								>
									Open the editor
									<ArrowRight className="ml-1.5 size-4" />
								</Button>
							</Link>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						{STATS.map((s, i) => (
							<motion.div
								key={s.label}
								initial={{ opacity: 0, y: 8 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.4, delay: i * 0.06 }}
								className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 backdrop-blur"
							>
								<div className="font-serif text-3xl font-medium italic tracking-[-0.02em] text-white md:text-4xl">
									{s.kind === "stars"
										? starsLabel
										: s.kind === "forks"
											? forksLabel
											: s.value}
								</div>
								<div className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-white/45">
									{s.label}
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

const STATS: Array<{
	label: string;
	value?: string;
	kind?: "stars" | "forks";
}> = [
	{ kind: "stars", label: "GitHub stars" },
	{ kind: "forks", label: "Forks" },
	{ value: "MIT", label: "License" },
	{ value: "0", label: "Dollars required" },
];
