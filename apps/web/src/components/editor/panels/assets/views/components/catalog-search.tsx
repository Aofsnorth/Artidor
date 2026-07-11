export { filterCatalogItems } from "./catalog-filter";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/utils/ui";
import { useI18n } from "@/lib/i18n";

export function CatalogSearch({
	value,
	onChange,
	placeholder,
	className,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}) {
	const { t } = useI18n();
	const resolvedPlaceholder = placeholder ?? t("catalog.searchPlaceholder");
	return (
		<label className={cn("relative block", className)}>
			<span className="sr-only">{resolvedPlaceholder}</span>
			<HugeiconsIcon
				icon={Search01Icon}
				className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/35"
			/>
			<input
				type="search"
				value={value}
				onChange={(event) => onChange(event.currentTarget.value)}
				placeholder={resolvedPlaceholder}
				className="h-8 w-full rounded-md border border-white/8 bg-white/4 pl-8 pr-2 text-xs text-white/85 outline-none transition placeholder:text-white/35 focus:border-white/18 focus:bg-white/6"
			/>
		</label>
	);
}

export function CatalogEmptyState({
	query,
	label,
}: {
	query: string;
	label?: string;
}) {
	const { t } = useI18n();
	return (
		<div className="rounded-md border border-white/8 bg-white/3 px-3 py-4 text-center text-xs text-white/45">
			{label ?? t("catalog.noResults", { query: query.trim() })}
		</div>
	);
}
