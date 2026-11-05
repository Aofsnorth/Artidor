"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "artidor-ai-disclaimer-dismissed";

export function AiDisclaimerBanner() {
	const { t } = useI18n();
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		setVisible(localStorage.getItem(STORAGE_KEY) !== "true");
	}, []);

	if (!visible) return null;

	return (
		<div className="relative z-50 border-b border-white/[0.06] bg-[#030306]/85 backdrop-blur-xl">
			<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-[12px] text-white/60 sm:px-6">
				<p className="truncate sm:whitespace-normal">
					<strong className="font-medium text-white/85">
						{t("home.aiDisclaimer.title")}
					</strong>{" "}
					<span className="text-white/30">—</span>{" "}
					<span>{t("home.aiDisclaimer.body")}</span>
				</p>
				<button
					type="button"
					onClick={() => {
						localStorage.setItem(STORAGE_KEY, "true");
						setVisible(false);
					}}
					className="flex size-6 shrink-0 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
					aria-label={t("home.aiDisclaimer.dismiss")}
				>
					<X className="size-3.5" />
				</button>
			</div>
		</div>
	);
}
