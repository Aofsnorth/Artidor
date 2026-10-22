"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { Button } from "./ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./ui/sheet";
import { Separator } from "./ui/separator";
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
	{ labelKey: "home.nav.blog", href: "/blog" },
];

export function Header({
	variant = "default",
}: {
	variant?: "default" | "editorial";
}) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const { t } = useI18n();
	const { data: repoData, formatted: repoStats } = useGitHubRepo();
	const hasStars = (repoData?.stars ?? 0) > 0;
	const starsLabel = hasStars ? (repoStats?.stars ?? "···") : "GIT";
	const isEditorial = variant === "editorial";

	return (
		<header
			className={cn(
				"sticky top-0 z-30 w-full",
				isEditorial
					? "border-b border-[#141413]/15 bg-[#D2CEC5]/95 backdrop-blur-sm"
					: "border-b border-white/[0.08] bg-[#0a0a0c]/90 backdrop-blur-md",
			)}
		>
			<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-4">
					<Link
						href="/"
						className={cn(
							"inline-flex min-h-11 items-center gap-2.5 px-1 py-1",
							isEditorial ? "text-[#141413]" : "text-white",
						)}
						aria-label="Artidor home"
					>
						{/* biome-ignore lint/performance/noImgElement: local SVG/PNG brand mark */}
						<img
							src={DEFAULT_LOGO_URL}
							alt=""
							width={26}
							height={26}
							className={cn(
								"size-6.5 rounded-[3px]",
								isEditorial && "border border-[#141413]/20 bg-[#141413] p-0.5",
							)}
						/>
						<span className="font-serif text-[19px] font-medium tracking-[-0.02em]">
							Artidor
						</span>
					</Link>

					{isEditorial && (
						<span
							aria-hidden="true"
							className="hidden border-l border-[#141413]/20 pl-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#4A4741] xl:inline-block"
						>
							NLE / WEBGPU / MIT
						</span>
					)}
				</div>

				<nav
					className="hidden items-center gap-0.5 lg:flex"
					aria-label={t("home.nav.primaryAria")}
				>
					{NAV_LINKS.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className={cn(
								"inline-flex min-h-11 items-center rounded-[3px] px-3 text-[12.5px] font-medium transition-colors duration-150",
								isEditorial
									? "text-[#4A4741] hover:bg-[#DFDCD4] hover:text-[#141413]"
									: "text-white/70 hover:bg-white/[0.06] hover:text-white",
							)}
						>
							{t(link.labelKey)}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-2">
					<Link
						href={SOCIAL_LINKS.github}
						prefetch={false}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(
							"hidden min-h-11 items-center gap-2 rounded-[3px] border px-3.5 text-[11.5px] font-medium tabular-nums transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] sm:inline-flex",
							isEditorial
								? "border-[#141413]/25 bg-[#DFDCD4] font-mono text-[#141413] shadow-beautiful-sm hover:border-[#141413] hover:bg-[#EAE7DF]"
								: "border-white/15 bg-white/[0.04] text-white/85 hover:bg-white/[0.08]",
						)}
						aria-label={t("home.nav.githubStars", {
							stars: repoStats?.stars ?? "open source",
						})}
					>
						<HugeiconsIcon icon={GithubIcon} className="size-3.5" />
						<span>{starsLabel}</span>
					</Link>

					<Button
						asChild
						variant={isEditorial ? "editorial" : "default"}
						size={isEditorial ? "editorial-sm" : "sm"}
						className={cn(
							"hidden md:inline-flex",
							!isEditorial &&
								"min-h-11 rounded-md bg-white px-4 text-[12.5px] font-medium text-[#0a0a0c] hover:bg-white/90",
						)}
					>
						<Link href="/projects" prefetch>
							<span>{t("home.nav.openEditor")}</span>
							<ArrowUpRight className="size-3.5" aria-hidden="true" />
						</Link>
					</Button>

					{/* Accessible Mobile Navigation Drawer using shadcn Sheet */}
					<Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
						<SheetTrigger asChild>
							<button
								type="button"
								className={cn(
									"inline-flex size-11 cursor-pointer items-center justify-center rounded-[3px] border transition-[transform,background-color] duration-150 active:scale-[0.97] lg:hidden",
									isEditorial
										? "border-[#141413]/25 bg-[#DFDCD4] text-[#141413] hover:bg-[#EAE7DF]"
										: "border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]",
								)}
								aria-label={t("home.nav.menuOpen")}
								aria-expanded={isMenuOpen}
							>
								<Menu className="size-5" aria-hidden="true" />
							</button>
						</SheetTrigger>
						<SheetContent
							side="right"
							className={cn(
								"flex w-[min(88vw,22rem)] flex-col justify-between p-6",
								isEditorial
									? " editorial-landing border-l border-[#141413]/20 bg-[#D2CEC5] text-[#141413] shadow-beautiful-lg"
									: "border-l border-white/10 bg-[#0d0d10] text-white",
							)}
						>
							<div className="flex flex-col gap-6">
								<SheetHeader className="text-left">
									<div className="flex items-center gap-2.5">
										<span
											className={cn(
												"ed-rule",
												!isEditorial && "bg-white/60",
											)}
											aria-hidden="true"
										/>
										<span
											className={cn(
												"font-mono text-[10.5px] uppercase tracking-[0.16em]",
												isEditorial ? "text-[#4A4741]" : "text-white/60",
											)}
										>
											INDEX / NAVIGATION
										</span>
									</div>
									<SheetTitle
										className={cn(
											"mt-1 font-serif text-2xl font-medium tracking-[-0.02em]",
											isEditorial ? "text-[#141413]" : "text-white",
										)}
									>
										Artidor
									</SheetTitle>
									<SheetDescription
										className={cn(
											"text-xs",
											isEditorial ? "text-[#4A4741]" : "text-white/60",
										)}
									>
										{t("home.hero.eyebrow.primary")}
									</SheetDescription>
								</SheetHeader>

								<Separator
									className={
										isEditorial ? "bg-[#141413]/15" : "bg-white/10"
									}
								/>

								<nav
									aria-label={t("home.nav.mobileAria")}
									className="flex flex-col gap-1"
								>
									{NAV_LINKS.map((link, idx) => (
										<Link
											key={link.href}
											href={link.href}
											onClick={() => setIsMenuOpen(false)}
											className={cn(
												"flex min-h-11 items-center justify-between rounded-[3px] px-3 py-2.5 text-[15px] font-medium transition-colors",
												isEditorial
													? "text-[#141413] hover:bg-[#DFDCD4]"
													: "text-white/90 hover:bg-white/[0.06]",
											)}
										>
											<span>{t(link.labelKey)}</span>
											<span
												className={cn(
													"font-mono text-[11px]",
													isEditorial ? "text-[#4A4741]" : "text-white/40",
												)}
											>
												0{idx + 1}
											</span>
										</Link>
									))}
								</nav>
							</div>

							<div className="flex flex-col gap-3 pt-6">
								<Button
									asChild
									variant={isEditorial ? "editorial" : "default"}
									size={isEditorial ? "editorial-default" : "lg"}
									className="w-full justify-between"
								>
									<Link
										href="/projects"
										onClick={() => setIsMenuOpen(false)}
									>
										<span>{t("home.nav.openEditor")}</span>
										<ArrowUpRight className="size-4" aria-hidden="true" />
									</Link>
								</Button>
								<Button
									asChild
									variant={isEditorial ? "editorial-outline" : "outline"}
									size={isEditorial ? "editorial-default" : "lg"}
									className="w-full justify-between"
								>
									<Link
										href={SOCIAL_LINKS.github}
										target="_blank"
										rel="noopener noreferrer"
										onClick={() => setIsMenuOpen(false)}
									>
										<span className="inline-flex items-center gap-2">
											<HugeiconsIcon icon={GithubIcon} className="size-4" />
											<span>GitHub</span>
										</span>
										<span className="font-mono text-xs tabular-nums">
											{starsLabel}
										</span>
									</Link>
								</Button>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
