import Link from "next/link";
import { RiDiscordFill, RiTwitterXLine } from "react-icons/ri";
import { FaGithub } from "react-icons/fa6";
import Image from "next/image";
import { DEFAULT_LOGO_URL } from "@/lib/site/brand";
import { SOCIAL_LINKS } from "@/lib/site/social";
import { capitalizeFirstLetter } from "@/utils/string";

type Category = "resources" | "company";

interface FooterLink {
	label: string;
	href: string;
}

type CategoryLinks = Record<Category, FooterLink[]>;

const links: CategoryLinks = {
	resources: [
		{ label: "Roadmap", href: "/roadmap" },
		{ label: "Changelog", href: "/changelog" },
		{ label: "Blog", href: "/blog" },
		{ label: "Privacy", href: "/privacy" },
		{ label: "Terms of use", href: "/terms" },
	],
	company: [
		{ label: "Contributors", href: "/contributors" },
		{ label: "Sponsors", href: "/sponsors" },
		{ label: "Brand", href: "/brand" },
		{ label: "About", href: `${SOCIAL_LINKS.github}/blob/main/README.md` },
	],
};

export function Footer() {
	return (
		<footer className="relative mx-auto mt-12 w-full max-w-6xl px-6 pb-12">
			<div className="panel glass-strong relative overflow-hidden rounded-3xl border border-white/10 p-8 backdrop-blur md:p-10">
				<div
					aria-hidden
					className="pointer-events-none absolute -top-20 right-0 size-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_70%)] blur-3xl"
				/>
				<div className="grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_2fr]">
					<div>
						<div className="mb-4 flex items-center gap-2.5">
							<Image
								src={DEFAULT_LOGO_URL}
								alt="Artidor"
								width={32}
								height={32}
								className="size-8 rounded-md"
							/>
							<span className="text-lg font-semibold tracking-[-0.01em] text-white">
								Artidor
							</span>
						</div>
						<p className="max-w-xs text-[13.5px] font-light leading-relaxed text-white/55">
							The privacy-first video editor that respects your machine. Free,
							open-source, runs in your browser or on your desktop.
						</p>
						<div className="mt-5 flex gap-2">
							<Link
								href={SOCIAL_LINKS.github}
								className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white"
								target="_blank"
								rel="noopener noreferrer"
								aria-label="GitHub"
							>
								<FaGithub className="size-4" />
							</Link>
							<Link
								href={SOCIAL_LINKS.x}
								className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white"
								target="_blank"
								rel="noopener noreferrer"
								aria-label="X (Twitter)"
							>
								<RiTwitterXLine className="size-4" />
							</Link>
							<Link
								href={SOCIAL_LINKS.discord}
								className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white"
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Discord"
							>
								<RiDiscordFill className="size-4" />
							</Link>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-6">
						{(Object.keys(links) as Category[]).map((category) => (
							<div key={category} className="flex flex-col gap-3">
								<h3 className="text-[10.5px] uppercase tracking-[0.18em] text-white/45">
									{capitalizeFirstLetter({ string: category })}
								</h3>
								<ul className="flex flex-col gap-2 text-[13.5px]">
									{links[category].map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												className="text-white/65 transition-colors hover:text-white"
												target={
													link.href.startsWith("http") ? "_blank" : undefined
												}
												rel={
													link.href.startsWith("http")
														? "noopener noreferrer"
														: undefined
												}
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>

				<div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-[12px] text-white/45 md:flex-row md:items-center">
					<span>
						© {new Date().getFullYear()} Artidor. MIT-licensed. Built in public.
					</span>
					<span className="flex items-center gap-2 text-white/40">
						<span className="size-1.5 rounded-full bg-emerald-400" />
						All systems normal
					</span>
				</div>
			</div>
		</footer>
	);
}
