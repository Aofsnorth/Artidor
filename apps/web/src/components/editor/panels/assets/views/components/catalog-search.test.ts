import { expect, test } from "bun:test";
import { filterCatalogItems } from "./catalog-filter";

test("catalog search filters by name category and keywords", () => {
	const items = [
		{ name: "Fade", category: "Transition", keywords: ["soft"] },
		{ name: "Glitch", category: "Effect", keywords: ["rgb"] },
	];
	const result = filterCatalogItems({
		items,
		query: "rgb",
		getText: (item) => [item.name, item.category, ...item.keywords],
	});
	expect(result.map((item) => item.name)).toEqual(["Glitch"]);
});

test("catalog search returns all items for blank query", () => {
	const items = [{ name: "Fade" }, { name: "Blur" }];
	const result = filterCatalogItems({
		items,
		query: " ",
		getText: (item) => [item.name],
	});
	expect(result).toEqual(items);
});
