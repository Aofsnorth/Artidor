/**
 * Final Editorial Poster CTA.
 *
 * Full-bleed prismatic surface with halated serif headline, clean actions,
 * and monumental lower display signature ("siren" poster composition).
 */

"use client";

import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function CtaSection() {
	const { t } = useI18n();
	return (
		<section className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 md:py-28">
			<div className="prism-surface relative overflow-hidden rounded-3xl px-6 py-16 text-center md:px-14 md:py-24">
				<div
					aria-hidden
					className="prism-hairline pointer-events-none absolute inset-x-0 top-0 h-[1px]"
				/>

				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-40 mix-blend-screen"
					style={{
						backgroundImage: "url(/wallpaper/prism-butterfly.jpg)",
						maskImage:
							"radial-gradient(ellipse 65% 65% at 50% 50%, black 15%, transparent 80%)",
						WebkitMaskImage:
							"radial-gradient(ellipse 65% 65% at 50% 50%, black 15%, transparent 80%)",
					}}
				/>

				<h2 className="halated-display text-balance mx-auto max-w-3xl font-serif text-5xl font-normal italic leading-[1.02] tracking-[-0.025em] text-white sm:text-6xl md:text-7xl">
					{t("home.cta.headline.line1")}
					<span className="mt-1 block bg-gradient-to-b from-white/95 via-white/75 to-white/45 bg-clip-text text-transparent">
						{t("home.cta.headline.line2")}
					</span>
				</h2>

				<p className="text-pretty mx-auto mt-6 max-w-xl text-[15.5px] font-light leading-relaxed text-white/68">
					{t("home.cta.body")}
				</p>

				<div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
					<Link href="/projects">
						<Button
							size="lg"
							className="h-12 rounded-full bg-white px-7 text-[14px] font-medium text-[#020204] shadow-[0_0_36px_rgba(255,255,255,0.28)] transition-all hover:bg-white/90"
						>
							{t("home.cta.openEditor")}
							<ArrowRight className="ml-2 size-4" />
						</Button>
					</Link>
					<Button
						size="lg"
						variant="outline"
						disabled
						title={t("home.cta.tooltip")}
						aria-label={t("home.cta.downloadAria")}
						className="h-12 cursor-not-allowed rounded-full border-white/15 bg-white/[0.04] px-6 text-[14px] font-medium text-white/55 backdrop-blur hover:bg-white/[0.04]"
					>
						<Download className="mr-2 size-4" />
						{t("home.cta.downloadDesktop")}
						<span className="ml-2 rounded-full border border-white/15 bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/65">
							{t("home.cta.badge")}
						</span>
					</Button>
				</div>

				<div
					aria-hidden
					className="halated-serif mt-16 select-none border-t border-white/[0.07] pt-10 font-serif text-6xl font-normal tracking-[0.12em] text-white/85 sm:text-8xl md:text-[6.5rem] md:leading-none"
				>
					artidor
				</div>
			</div>
		</section>
	);
}
