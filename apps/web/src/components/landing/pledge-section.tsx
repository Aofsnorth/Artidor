"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
	const starsLabel = repoStats?.stars ?? "40k+";
	const forksLabel = repoStats?.forks ?? "2.4k+";

	return (
		<section
			aria-labelledby="pledge-heading"
			className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 md:py-28 lg:px-8"
		>
			<Card
				variant="editorial-ink"
				className="relative overflow-hidden p-6 sm:p-10 md:p-14"
			>
				<div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
					<div className="flex flex-col justify-between gap-6 lg:col-span-7">
						<div className="flex items-center gap-3">
							<span className="ed-rule-light" aria-hidden="true" />
							<span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#D2CEC5]">
								{t("home.pledge.eyebrow")}
							</span>
						</div>

						<h2
							id="pledge-heading"
							className="font-serif text-[clamp(2.2rem,4.4vw,3.85rem)] font-normal leading-[1.02] tracking-[-0.025em] text-[#F4F1EA]"
						>
							<span className="block">{t("home.pledge.headline.line1")}</span>
							<span className="block italic text-[#D2CEC5]">
								{t("home.pledge.headline.line2")}
							</span>
						</h2>

						<p className="max-w-[54ch] text-[15px] leading-[1.65] text-[#EAE7DF]/85">
							{t("home.pledge.body")}
						</p>

						<div className="mt-2 flex flex-wrap items-center gap-3">
							<Button asChild variant="editorial-light" size="editorial-lg">
								<Link
									href="https://github.com/Aofsnorth/Artidor"
									target="_blank"
									rel="noopener noreferrer"
								>
									<HugeiconsIcon icon={GithubIcon} className="size-4" />
									<span>{t("home.pledge.cta.starRepo")}</span>
									{repoStats?.stars && (
										<span className="ml-1 rounded-[2px] bg-[#141413] px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums text-[#F4F1EA]">
											{starsLabel}
										</span>
									)}
								</Link>
							</Button>

							<Button
								asChild
								variant="editorial-outline"
								size="editorial-lg"
								className="border-[#F4F1EA]/35 bg-transparent text-[#F4F1EA] hover:border-[#F4F1EA] hover:bg-[#F4F1EA]/10"
							>
								<Link href="/projects">
									<span>{t("home.pledge.cta.openEditor")}</span>
									<ArrowUpRight className="size-4" aria-hidden="true" />
								</Link>
							</Button>
						</div>
					</div>

					{/* Right Column: Monolith Audit Grid */}
					<div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-[#F4F1EA]/20 bg-[#F4F1EA]/20 lg:col-span-5">
						{STATS.map((s, idx) => (
							<div
								key={s.labelKey}
								className="flex flex-col justify-between gap-4 bg-[#1B1B19] p-5 sm:p-6"
							>
								<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#D2CEC5]/70">
									AUDIT 0{idx + 1}
								</span>
								<div className="font-serif text-3xl font-normal italic tracking-[-0.02em] tabular-nums text-[#F4F1EA] sm:text-4xl">
									{s.kind === "stars"
										? starsLabel
										: s.kind === "forks"
											? forksLabel
											: s.value}
								</div>
								<div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#D2CEC5]">
									{t(s.labelKey)}
								</div>
							</div>
						))}
					</div>
				</div>
			</Card>
		</section>
	);
}
