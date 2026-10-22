/**
 * Query string shared by the first page and the paginated "load more"
 * request. Building both from one function keeps filters — currently
 * `commercial_only` — from silently diverging between pages.
 */
export function buildSoundSearchParams({
	query,
	page,
	commercialOnly,
}: {
	query: string;
	page: number;
	commercialOnly: boolean;
}): URLSearchParams {
	const params = new URLSearchParams({
		page: String(page),
		type: "effects",
		commercial_only: String(commercialOnly),
	});

	if (query.trim()) {
		params.set("q", query);
	}

	return params;
}
