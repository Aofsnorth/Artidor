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
 * Accessible language switcher with a minimum 44×44px touch target (WCAG 2.5.8).
 * Styled to harmonize with the warm-stone editorial monograph surface.
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
					className="min-h-11 gap-2 rounded-[3px] border border-[#141413]/30 bg-[#EAE7DF] px-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#141413] shadow-beautiful-md hover:border-[#141413] hover:bg-[#F4F1EA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141413] [&>svg]:text-[#141413]/70"
				>
					<Globe className="size-3.5" aria-hidden="true" />
					<SelectValue placeholder={t("language.switchLabel")} />
				</SelectTrigger>
				<SelectContent className="rounded-[4px] border border-[#141413]/25 bg-[#EAE7DF] text-[#141413] shadow-beautiful-lg">
					{LOCALES.map((code) => (
						<SelectItem
							key={code}
							value={code}
							className="min-h-10 font-mono text-[11.5px] uppercase tracking-[0.08em] focus:bg-[#141413] focus:text-[#F4F1EA]"
						>
							{t(`language.${code}` as const)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
