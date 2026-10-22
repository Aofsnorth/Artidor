"use client";

import Link from "next/link";
import { ArrowUpRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export function CtaSection() {
	const { t } = useI18n();

	return (
		<section
			aria-labelledby="cta-heading"
			className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 md:pb-24 lg:px-8"
		>
			<div className="grid grid-cols-1 items-end gap-8 border-t-2 border-[#141413] pt-12 lg:grid-cols-12">
				<div className="lg:col-span-8">
					<div className="mb-4 flex items-center gap-3">
						<span className="ed-rule" aria-hidden="true" />
						<span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#4A4741]">
							COLOPHON / READY TO CUT
						</span>
					</div>

					<h2
						id="cta-heading"
						className="font-serif text-[clamp(2.35rem,5vw,4.5rem)] font-normal leading-[0.98] tracking-[-0.03em] text-[#141413]"
					>
						<span className="block">{t("home.cta.headline.line1")}</span>
						<span className="block italic text-[#282725]">
							{t("home.cta.headline.line2")}
						</span>
					</h2>

					<p className="mt-5 max-w-[54ch] text-[15.5px] leading-[1.65] text-[#282725]">
						{t("home.cta.body")}
					</p>
				</div>

				<div className="flex flex-col items-start gap-3 lg:col-span-4 lg:items-end">
					<Button
						asChild
						variant="editorial"
						size="editorial-lg"
						className="w-full justify-between sm:w-auto"
					>
						<Link href="/projects">
							<span>{t("home.cta.openEditor")}</span>
							<ArrowUpRight className="size-4" aria-hidden="true" />
						</Link>
					</Button>

					<Button
						asChild
						variant="editorial-outline"
						size="editorial-lg"
						className="w-full justify-between sm:w-auto"
					>
						<Link
							href="/roadmap"
							title={t("home.cta.tooltip")}
							aria-label={t("home.cta.downloadAria")}
						>
							<Terminal className="size-4" aria-hidden="true" />
							<span>{t("home.cta.downloadDesktop")}</span>
							<Badge variant="editorial" className="ml-1">
								{t("home.cta.badge")}
							</Badge>
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
