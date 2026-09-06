"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { Button } from "./ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./ui/sheet";
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

/** Public navigation uses a portaled, focus-trapped sheet below desktop width. */
export function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const closeMenu = () => setIsMenuOpen(false);
	const { t } = useI18n();
	const { formatted: repoStats } = useGitHubRepo();

	useEffect(() => {
		const desktop = window.matchMedia("(min-width: 1024px)");
		const handleResize = () => {
			if (desktop.matches) setIsMenuOpen(false);
		};
		desktop.addEventListener("change", handleResize);
		return () => desktop.removeEventListener("change", handleResize);
	}, []);

	return (
		<header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur-sm">
			<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
				<Link
					href="/"
					className="flex shrink-0 items-center gap-2.5 rounded-md"
					aria-label="Artidor home"
				>
					<Image
						src={DEFAULT_LOGO_URL}
						alt=""
						width={28}
						height={28}
						className="size-7 rounded-md"
						unoptimized
					/>
					<span className="text-base font-semibold tracking-tight text-foreground">
						Artidor
					</span>
				</Link>
				<nav
					className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
					aria-label={t("home.nav.primaryAria")}
				>
					{NAV_LINKS.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
						>
							{t(link.labelKey)}
						</Link>
					))}
				</nav>
				<div className="flex shrink-0 items-center gap-2">
					<Link
						href={SOCIAL_LINKS.github}
						prefetch={false}
						className="hidden h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground xl:flex"
						aria-label={t("home.nav.githubStars", {
							stars: repoStats?.stars ?? "",
						})}
					>
						<FaGithub aria-hidden="true" className="size-4" />
						{repoStats?.stars ? (
							<span className="tabular-nums">{repoStats.stars}</span>
						) : null}
					</Link>
					<Button asChild className="h-11 px-3 sm:h-9">
						<Link href="/projects" prefetch>
							{t("home.nav.openEditor")}
							<ArrowRight aria-hidden="true" className="size-4" />
						</Link>
					</Button>
					<Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
						<SheetTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-11 lg:hidden"
								aria-label={t("home.nav.menuOpen")}
							>
								<Menu aria-hidden="true" className="size-5" />
							</Button>
						</SheetTrigger>
						<SheetContent
							side="right"
							className="dark w-[min(22rem,100%)] overflow-y-auto overscroll-contain bg-background text-foreground [&>button]:size-11"
							aria-describedby={undefined}
							onOpenAutoFocus={(event) => event.stopPropagation()}
						>
							<SheetHeader className="mb-6 pr-8 text-left">
								<SheetTitle>{t("home.nav.mobileAria")}</SheetTitle>
							</SheetHeader>
							<nav
								className="flex flex-col gap-1"
								aria-label={t("home.nav.mobileAria")}
							>
								{NAV_LINKS.map((link) => (
									<Link
										key={link.href}
										href={link.href}
										className="flex min-h-11 items-center rounded-md px-3 text-base text-white/80 hover:bg-white/5 hover:text-white"
										onClick={closeMenu}
									>
										{t(link.labelKey)}
									</Link>
								))}
								<Button asChild className="mt-6 h-11">
									<Link href="/projects" onClick={closeMenu}>
										{t("home.nav.openEditor")}
										<ArrowRight aria-hidden="true" className="size-4" />
									</Link>
								</Button>
							</nav>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
