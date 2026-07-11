/**
 * Shared helpers for rendering AI chat tool results without choking the
 * DOM on megabytes of base64/JSON text.
 */

/**
 * Recursively truncate very long strings in arbitrary data so the DOM isn't
 * asked to render huge blobs. Data URLs are summarized; other long strings are
 * capped with their length.
 */
export function truncateLongStrings(value: unknown): unknown {
	if (typeof value === "string") {
		if (value.length > 500) {
			return `${value.slice(0, 180)}… (${value.length} chars)`;
		}
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(truncateLongStrings);
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, truncateLongStrings(v)]),
		);
	}
	return value;
}
