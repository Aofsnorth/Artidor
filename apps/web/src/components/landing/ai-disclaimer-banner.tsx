"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "artidor-ai-disclaimer-dismissed";

export function AiDisclaimerBanner() {
	const { t } = useI18n();
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		try {
			setVisible(localStorage.getItem(STORAGE_KEY) !== "true");
		} catch {
			setVisible(true);
		}
	}, []);

	if (!visible) return null;

	return (
		<aside
			aria-label={t("home.aiDisclaimer.title")}
			className="relative z-40 border-b border-[#141413] bg-[#141413] text-[#F4F1EA]"
		>
			<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-relaxed">
					<span className="inline-flex items-center rounded-[2px] border border-[#F4F1EA]/30 bg-[#F4F1EA]/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#F4F1EA]">
						{t("home.aiDisclaimer.title")}
					</span>
					<p className="text-[#EAE7DF]/90">{t("home.aiDisclaimer.body")}</p>
				</div>
				<button
					type="button"
					onClick={() => {
						try {
							localStorage.setItem(STORAGE_KEY, "true");
						} catch {
							// Ignore storage write errors in private browsing
						}
						setVisible(false);
					}}
					className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-[#F4F1EA]/80 transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#F4F1EA]/10 hover:text-[#F4F1EA] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4F1EA]"
					aria-label={t("home.aiDisclaimer.dismiss")}
				>
					<X className="size-4" aria-hidden="true" />
				</button>
			</div>
		</aside>
	);
}
