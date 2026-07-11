export function filterCatalogItems<T>({
	items,
	query,
	getText,
}: {
	items: T[];
	query: string;
	getText: (item: T) => Array<string | null | undefined>;
}): T[] {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return items;
	return items.filter((item) =>
		getText(item)
			.filter(Boolean)
			.some((text) => text?.toLowerCase().includes(normalizedQuery)),
	);
}
