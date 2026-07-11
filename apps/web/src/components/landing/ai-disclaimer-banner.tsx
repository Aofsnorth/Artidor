"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
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
		<div className="sticky top-0 z-50 border-b border-amber-500/30 bg-amber-950/80 backdrop-blur-md relative">
			<div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2.5 text-sm text-amber-100">
				<AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
				<p>
					<strong>{t("home.aiDisclaimer.title")}</strong> — {t("home.aiDisclaimer.body")}
				</p>
			</div>
			<button
				type="button"
				onClick={() => {
					localStorage.setItem(STORAGE_KEY, "true");
					setVisible(false);
				}}
				className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-amber-300 transition-colors hover:bg-amber-800/50 hover:text-amber-100"
				aria-label={t("home.aiDisclaimer.dismiss")}
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
