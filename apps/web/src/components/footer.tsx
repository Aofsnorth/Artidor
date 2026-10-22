"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	DiscordIcon,
	GithubIcon,
	NewTwitterIcon,
} from "@hugeicons/core-free-icons";
import Image from "next/image";
import { DEFAULT_LOGO_URL } from "@/lib/site/brand";
import { SOCIAL_LINKS } from "@/lib/site/social";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/utils/ui";

type Category = "resources" | "company";

interface FooterLink {
	labelKey: string;
	href: string;
}

type CategoryLinks = Record<Category, FooterLink[]>;

const CATEGORY_KEYS: Record<Category, string> = {
	resources: "home.footer.category.resources",
	company: "home.footer.category.company",
};

const links: CategoryLinks = {
	resources: [
		{ labelKey: "home.footer.link.docs", href: "/docs" },
		{ labelKey: "home.footer.link.roadmap", href: "/roadmap" },
		{ labelKey: "home.footer.link.changelog", href: "/changelog" },
		{ labelKey: "home.footer.link.blog", href: "/blog" },
		{ labelKey: "home.footer.link.privacy", href: "/privacy" },
		{ labelKey: "home.footer.link.terms", href: "/terms" },
	],
	company: [
		{ labelKey: "home.footer.link.contributors", href: "/contributors" },
		{ labelKey: "home.footer.link.sponsors", href: "/sponsors" },
		{ labelKey: "home.footer.link.brand", href: "/brand" },
		{
			labelKey: "home.footer.link.about",
			href: `${SOCIAL_LINKS.github}/blob/main/README.md`,
		},
	],
};

export function Footer({
	variant = "default",
}: {
	variant?: "default" | "editorial";
}) {
	const { t } = useI18n();
	const isEditorial = variant === "editorial";

	return (
		<footer
			className={cn(
				"relative mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8",
				!isEditorial && "mt-12 max-w-6xl",
			)}
		>
			<div
				className={cn(
					"relative overflow-hidden p-6 sm:p-8 md:p-12",
					isEditorial
						? "rounded-[4px] border border-[#141413]/20 bg-[#DFDCD4] text-[#141413] shadow-beautiful-md"
						: "panel glass-strong rounded-3xl border border-white/10 text-white backdrop-blur",
				)}
			>
				<div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
					<div className="flex flex-col justify-between gap-6 lg:col-span-5">
						<div>
							<div className="mb-4 flex items-center gap-3">
								<Image
									src={DEFAULT_LOGO_URL}
									alt="Artidor"
									width={30}
									height={30}
									className={cn(
										"size-7.5 rounded-[3px]",
										isEditorial &&
											"border border-[#141413]/20 bg-[#141413] p-0.5",
									)}
								/>
								<span className="font-serif text-xl font-medium tracking-[-0.02em]">
									Artidor
								</span>
							</div>
							<p
								className={cn(
									"max-w-sm text-[14px] leading-relaxed",
									isEditorial ? "text-[#4A4741]" : "text-white/60",
								)}
							>
								{t("home.footer.tagline")}
							</p>
						</div>

						<div className="flex items-center gap-2">
							<Link
								href={SOCIAL_LINKS.github}
								className={cn(
									"inline-flex size-11 items-center justify-center rounded-[3px] border transition-[transform,background-color,border-color] duration-150 active:scale-[0.97]",
									isEditorial
										? "border-[#141413]/25 bg-[#EAE7DF] text-[#141413] shadow-beautiful-sm hover:border-[#141413] hover:bg-[#141413] hover:text-[#F4F1EA]"
										: "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white",
								)}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={t("home.footer.social.github")}
							>
								<HugeiconsIcon icon={GithubIcon} className="size-4" />
							</Link>
							<Link
								href={SOCIAL_LINKS.x}
								className={cn(
									"inline-flex size-11 items-center justify-center rounded-[3px] border transition-[transform,background-color,border-color] duration-150 active:scale-[0.97]",
									isEditorial
										? "border-[#141413]/25 bg-[#EAE7DF] text-[#141413] shadow-beautiful-sm hover:border-[#141413] hover:bg-[#141413] hover:text-[#F4F1EA]"
										: "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white",
								)}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={t("home.footer.social.x")}
							>
								<HugeiconsIcon icon={NewTwitterIcon} className="size-4" />
							</Link>
							{SOCIAL_LINKS.discord && (
								<Link
									href={SOCIAL_LINKS.discord}
									className={cn(
										"inline-flex size-11 items-center justify-center rounded-[3px] border transition-[transform,background-color,border-color] duration-150 active:scale-[0.97]",
										isEditorial
											? "border-[#141413]/25 bg-[#EAE7DF] text-[#141413] shadow-beautiful-sm hover:border-[#141413] hover:bg-[#141413] hover:text-[#F4F1EA]"
											: "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white",
									)}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={t("home.footer.social.discord")}
								>
									<HugeiconsIcon icon={DiscordIcon} className="size-4" />
								</Link>
							)}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:col-span-7">
						{(Object.keys(links) as Category[]).map((category) => (
							<div key={category} className="flex flex-col gap-3">
								<div className="flex items-center gap-2.5">
									{isEditorial && (
										<span className="ed-rule" aria-hidden="true" />
									)}
									<h3
										className={cn(
											"font-mono text-[11px] font-medium uppercase tracking-[0.16em]",
											isEditorial ? "text-[#4A4741]" : "text-white/45",
										)}
									>
										{t(CATEGORY_KEYS[category])}
									</h3>
								</div>
								<ul className="flex flex-col gap-1 text-[14px]">
									{links[category].map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												className={cn(
													"inline-flex min-h-11 items-center rounded-[3px] px-1 transition-colors",
													isEditorial
														? "text-[#141413]/85 underline-offset-4 hover:text-[#141413] hover:underline"
														: "text-white/65 hover:text-white",
												)}
												target={
													link.href.startsWith("http") ? "_blank" : undefined
												}
												rel={
													link.href.startsWith("http")
														? "noopener noreferrer"
														: undefined
												}
											>
												{t(link.labelKey)}
											</Link>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>

				<div
					className={cn(
						"mt-10 flex flex-col items-start justify-between gap-4 border-t pt-6 font-mono text-[11.5px] sm:flex-row sm:items-center",
						isEditorial
							? "border-[#141413]/15 text-[#4A4741]"
							: "border-white/10 text-white/45",
					)}
				>
					<span>
						{t("home.footer.copyright", { year: new Date().getFullYear() })}
					</span>
					<span className="inline-flex items-center gap-2">
						<span
							aria-hidden="true"
							className={cn(
								"size-2 rounded-[1px]",
								isEditorial ? "bg-[#141413]" : "rounded-full bg-emerald-400",
							)}
						/>
						<span>{t("home.footer.status")}</span>
					</span>
				</div>
			</div>
		</footer>
	);
}
