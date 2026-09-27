/**
 * Structural country metadata: the region list and the search-alias groups.
 *
 * This lives in its own module (instead of alongside `COUNTRIES`) so
 * `providers/flags.ts` can keep its `import("./countries-data")` effective:
 * the ~1.8k-line `COUNTRIES` array (every country, its languages and flag
 * colours) then only lands in the lazy chunk that a sticker-panel search
 * fetches, while the tiny region vocabulary below stays in the editor chunk
 * where `resolveQueryToRegions` / `getRegionLabel` need it.
 *
 * `countries-data.ts` still exports its own copy of these three symbols; that
 * duplicate is dead weight in the lazy chunk only and can be deleted from
 * there once that file is next touched — nothing outside this file reads them
 * from there.
 */

/** Region vocabulary used to group and filter countries. */
export const REGIONS = [
	{ id: "Western Europe", aliases: ["west europe"] },
	{ id: "Eastern Europe", aliases: ["east europe"] },
	{ id: "Northern Europe", aliases: ["north europe"] },
	{ id: "Southern Europe", aliases: ["south europe"] },
	{ id: "South Asia", aliases: ["southern asia"] },
	{ id: "Southeast Asia", aliases: ["south east asia"] },
	{ id: "East Asia", aliases: ["eastern asia", "far east"] },
	{ id: "Central Asia", aliases: [] },
	{ id: "Middle East", aliases: ["west asia"] },
	{ id: "North Africa", aliases: ["northern africa"] },
	{ id: "Sub-Saharan Africa", aliases: ["subsaharan africa"] },
	{ id: "North America", aliases: ["northern america"] },
	{ id: "South America", aliases: ["southern america", "latin america"] },
	{ id: "Central America", aliases: ["central am"] },
	{ id: "Caribbean", aliases: ["caribbean islands"] },
	{ id: "Oceania", aliases: ["pacific", "pacific islands"] },
	{ id: "Antarctica", aliases: [] },
	{ id: "Atlantic Ocean", aliases: ["atlantic"] },
	{ id: "North Atlantic", aliases: [] },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

/**
 * Multi-word search terms that expand to several regions ("europe" →
 * four European regions). Keys are the lower-cased, space-separated query.
 */
export const REGION_GROUPS: Partial<Record<string, RegionId[]>> = {
	europe: [
		"Western Europe",
		"Eastern Europe",
		"Northern Europe",
		"Southern Europe",
	],
	asia: ["South Asia", "Southeast Asia", "East Asia", "Central Asia"],
	africa: ["Sub-Saharan Africa", "North Africa"],
	america: ["North America", "South America", "Central America", "Caribbean"],
};
