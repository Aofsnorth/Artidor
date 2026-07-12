"use client";

import { Globe } from "lucide-react";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/utils/ui";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

/**
 * Compact language dropdown for the marketing site. The current locale
 * is shown as a button; picking a different option updates the global
 * locale and persists it to localStorage via the I18n provider.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
	const { locale, setLocale, t } = useI18n();

	return (
		<div className={cn("relative", className)}>
			<Select
				value={locale}
				onValueChange={(value) => setLocale(value as Locale)}
			>
				<SelectTrigger
					aria-label={t("language.switchLabel")}
					className="h-8 gap-1 rounded-full border-white/10 bg-white/[0.04] px-3 text-[11px] font-medium text-white/80 hover:bg-white/[0.08] focus:ring-0 focus:ring-offset-0 [&>svg]:text-white/60"
				>
					<Globe className="size-3.5" />
					<SelectValue placeholder={t("language.switchLabel")} />
				</SelectTrigger>
				<SelectContent className="rounded-xl border-white/10 bg-[#0a0a0c]/90 text-white backdrop-blur">
					{LOCALES.map((code) => (
						<SelectItem
							key={code}
							value={code}
							className="text-[12px] focus:bg-white/10 focus:text-white"
						>
							{t(`language.${code}` as const)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
