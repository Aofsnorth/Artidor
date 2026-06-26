"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, Menu } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { Button } from "./ui/button";
import { cn } from "@/utils/ui";
import { DEFAULT_LOGO_URL } from "@/lib/site/brand";
import { SOCIAL_LINKS } from "@/lib/site/social";
import { useGitHubRepo } from "@/hooks/use-github-repo";

const NAV_LINKS = [
	{ label: "Features", href: "/#features" },
	{ label: "Arth", href: "/#ai-copilot" },
	{ label: "Docs", href: "/docs" },
	{ label: "Roadmap", href: "/roadmap" },
	{ label: "Changelog", href: "/changelog" },
	{ label: "Contributors", href: "/contributors" },
	{ label: "Blog", href: "/blog" },
];

export function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const closeMenu = () => setIsMenuOpen(false);
	const { data: repoData, formatted: repoStats } = useGitHubRepo();
	// While the data is loading, fall back to a placeholder that
	// matches the visual width of the eventual number. This keeps
	// the header from shifting once the real count lands.
	const hasStars = (repoData?.stars ?? 0) > 0;
	const starsLabel = hasStars ? (repoStats?.stars ?? "···") : "★";

	return (
		<header
			className="sticky top-0 z-30 w-full border-b border-white/[0.06] bg-black/35 backdrop-blur-xl"
			style={{
				// Smooth fade at the bottom edge so the glassmorphism
				// blends into the page content instead of having a
				// hard 1px border line. The gradient mask makes the
				// bottom 30% of the header gradually transparent.
				maskImage:
					"linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
				WebkitMaskImage:
					"linear-gradient(to bottom, black 0%, black 70%, transparent 100%)",
			}}
		>
			{/* Inner container — full-bleed bar, content centred inside.
			   `max-w-7xl` lines the header up with the rest of the page
			   content (hero, features, footer all use the same width). */}
			<div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:h-16">
				<div className="flex items-center gap-3 md:gap-8">
					<Link
						href="/"
						className="flex items-center gap-2.5"
						aria-label="Artidor home"
					>
						{/* Plain <img> is intentional — the logo is a local
						   asset and we want it to render before hydration. */}
						{/* biome-ignore lint/performance/noImgElement: logo, see comment above */}
						<img
							src={DEFAULT_LOGO_URL}
							alt="Artidor Logo"
							width={28}
							height={28}
							className="size-7 rounded-md"
						/>
						<span className="text-[15px] font-semibold tracking-[-0.01em] text-white">
							Artidor
						</span>
					</Link>

					<nav
						className="hidden items-center gap-1 md:flex"
						aria-label="Primary"
					>
						{NAV_LINKS.map((link) => (
							<Link key={link.href} href={link.href}>
								<Button
									variant="text"
									className="h-8 px-3 text-[13px] text-white/65 hover:text-white"
								>
									{link.label}
								</Button>
							</Link>
						))}
					</nav>
				</div>

				<div className="flex items-center gap-2">
					<div className="hidden items-center gap-2 md:flex">
						<Link
							href={SOCIAL_LINKS.github}
							prefetch={false}
							className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/80 transition-colors hover:bg-white/[0.08]"
							aria-label={`Artidor on GitHub, ${repoStats?.stars ?? ""} stars`}
						>
							<FaGithub className="size-3" />
							{starsLabel}
						</Link>
					</div>

					<Link href="/projects" prefetch className="hidden md:inline-flex">
						<Button
							size="sm"
							className="h-8 rounded-full bg-white px-3.5 text-[12.5px] font-medium text-[#0a0a0c] hover:bg-white/90"
						>
							<Sparkles className="mr-1.5 size-3.5" />
							Open editor
							<ArrowRight className="ml-1 size-3.5" />
						</Button>
					</Link>

					<button
						type="button"
						className="rounded-md p-1.5 text-white/85 hover:bg-white/[0.06] hover:text-white md:hidden"
						aria-label="Toggle menu"
						aria-expanded={isMenuOpen}
						onClick={() => setIsMenuOpen(!isMenuOpen)}
					>
						<Menu className="size-5" />
					</button>
				</div>
			</div>

			{/* Mobile menu — full-screen overlay, same dark luxury backdrop. */}
			<div
				className={cn(
					"pointer-events-none fixed inset-0 z-40 bg-black/65 opacity-0 backdrop-blur-3xl transition-opacity duration-200",
					isMenuOpen && "pointer-events-auto opacity-100",
				)}
			>
				<div className="relative h-full">
					<button
						type="button"
						aria-label="Close menu"
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
						className="mx-auto flex h-full w-full max-w-7xl flex-col gap-2 px-6 pt-24"
						aria-label="Mobile primary"
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
									duration: 0.35,
									delay: isMenuOpen ? index * 0.07 : 0,
									ease: [0.25, 0.46, 0.45, 0.94],
								}}
							>
								<Link
									href={link.href}
									className="text-2xl font-semibold text-white"
									onClick={() => setIsMenuOpen(false)}
								>
									{link.label}
								</Link>
							</motion.div>
						))}
						<Link
							href="/projects"
							className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-[#0a0a0c]"
							onClick={() => setIsMenuOpen(false)}
						>
							Open editor
							<ArrowRight className="size-4" />
						</Link>
					</nav>
				</div>
			</div>
		</header>
	);
}
