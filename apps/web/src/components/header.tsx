"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { Button } from "./ui/button";
import { cn } from "@/utils/ui";
import { DEFAULT_LOGO_URL } from "@/lib/site/brand";
import { SOCIAL_LINKS } from "@/lib/site/social";
import { useGitHubRepo } from "@/hooks/use-github-repo";
import { useI18n } from "@/lib/i18n";

const NAV_LINKS = [
	{ labelKey: "home.nav.features", href: "/#features" },
	{ labelKey: "home.nav.ai", href: "/#ai-copilot" },
	{ labelKey: "home.nav.docs", href: "/docs" },
	{ labelKey: "home.nav.roadmap", href: "/roadmap" },
	{ labelKey: "home.nav.changelog", href: "/changelog" },
	{ labelKey: "home.nav.contributors", href: "/contributors" },
];

export function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const closeMenu = () => setIsMenuOpen(false);
	const { t } = useI18n();
	const { data: repoData, formatted: repoStats } = useGitHubRepo();
	const hasStars = (repoData?.stars ?? 0) > 0;
	const starsLabel = hasStars ? (repoStats?.stars ?? "···") : "★";

	return (
		<header className="sticky top-0 z-30 w-full border-b border-white/[0.06] bg-[#020204]/70 backdrop-blur-2xl">
			<div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:h-16">
				<Link
					href="/"
					className="flex items-center gap-2.5"
					aria-label="Artidor home"
				>
					{/* biome-ignore lint/performance/noImgElement: local brand mark */}
					<img
						src={DEFAULT_LOGO_URL}
						alt="Artidor Logo"
						width={26}
						height={26}
						className="size-6.5 rounded-md"
					/>
					<span className="font-serif text-[18px] font-normal italic tracking-[-0.02em] text-white">
						Artidor
					</span>
				</Link>

				<nav
					className="hidden flex-1 items-center justify-center gap-1 lg:flex"
					aria-label={t("home.nav.primaryAria")}
				>
					{NAV_LINKS.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="rounded-full px-3.5 py-1.5 text-[13px] text-white/65 transition-colors hover:text-white"
						>
							{t(link.labelKey)}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-2.5">
					<Link
						href={SOCIAL_LINKS.github}
						prefetch={false}
						className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/80 transition-colors hover:border-white/20 hover:bg-white/[0.07] md:flex"
						aria-label={t("home.nav.githubStars", {
							stars: repoStats?.stars ?? "",
						})}
					>
						<HugeiconsIcon icon={GithubIcon} className="size-3.5" />
						<span className="tabular-nums">{starsLabel}</span>
					</Link>

					<Link href="/projects" prefetch className="hidden md:inline-flex">
						<Button
							size="sm"
							className="h-8 rounded-full bg-white px-4 text-[12.5px] font-medium text-[#020204] hover:bg-white/90"
						>
							{t("home.nav.openEditor")}
							<ArrowRight className="ml-1 size-3.5" />
						</Button>
					</Link>

					<button
						type="button"
						className="rounded-md p-1.5 text-white/85 hover:bg-white/[0.06] hover:text-white lg:hidden"
						aria-label={t("home.nav.menuOpen")}
						aria-expanded={isMenuOpen}
						onClick={() => setIsMenuOpen(!isMenuOpen)}
					>
						{isMenuOpen ? (
							<X className="size-5" />
						) : (
							<Menu className="size-5" />
						)}
					</button>
				</div>
			</div>

			<div
				className={cn(
					"pointer-events-none fixed inset-0 top-14 z-40 bg-[#020204]/95 opacity-0 backdrop-blur-3xl transition-opacity duration-200",
					isMenuOpen && "pointer-events-auto opacity-100",
				)}
			>
				<div className="relative h-full">
					<button
						type="button"
						aria-label={t("home.nav.menuClose")}
						className="absolute inset-0"
						onClick={closeMenu}
						onKeyDown={(event) => {
							if (
								event.key === "Enter" ||
								event.key === " " ||
								event.key === "Escape"
							) {
								event.preventDefault();
								closeMenu();
							}
						}}
					/>
					<nav
						className="mx-auto flex h-full w-full max-w-7xl flex-col gap-3 px-6 pt-12"
						aria-label={t("home.nav.mobileAria")}
					>
						{NAV_LINKS.map((link, index) => (
							<motion.div
								key={link.href}
								initial={{ scale: 0.98, opacity: 0 }}
								animate={{
									scale: isMenuOpen ? 1 : 0.98,
									opacity: isMenuOpen ? 1 : 0,
								}}
								transition={{
									duration: 0.3,
									delay: isMenuOpen ? index * 0.05 : 0,
								}}
							>
								<Link
									href={link.href}
									className="block border-b border-white/[0.06] py-3 font-serif text-3xl italic text-white"
									onClick={closeMenu}
								>
									{t(link.labelKey)}
								</Link>
							</motion.div>
						))}
						<Link
							href="/projects"
							className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-medium text-[#020204]"
							onClick={closeMenu}
						>
							{t("home.nav.openEditor")}
							<ArrowRight className="size-4" />
						</Link>
					</nav>
				</div>
			</div>
		</header>
	);
}
