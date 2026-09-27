/**
 * `browseCategory` used to call `provider.browse({ options: {} })` with no
 * limit, so selecting the Flags category mounted all 254 country cards at
 * once (each with a decoded preview URL) before the user had scrolled. These
 * tests pin the cap — and that an explicit `limit` still wins, so a caller
 * that needs the full catalogue can ask for it.
 */
import { describe, expect, test } from "bun:test";
import { browseCategory } from "../index";

describe("browseCategory", () => {
	test("caps a single category browse instead of returning the whole catalogue", async () => {
		const result = await browseCategory({ category: "flags" });
		const items = result.sections.flatMap((section) => section.items);

		expect(items.length).toBeGreaterThan(0);
		expect(items.length).toBeLessThanOrEqual(60);
		// The provider reports the real total so the UI can tell there is more.
		expect(result.sections[0]?.hasMore).toBe(true);
	});

	test("honours an explicit limit", async () => {
		const result = await browseCategory({ category: "flags", limit: 5 });
		const items = result.sections.flatMap((section) => section.items);

		expect(items).toHaveLength(5);
	});

	test("returns nothing for the aggregate category", async () => {
		const result = await browseCategory({ category: "all" });
		expect(result.sections).toEqual([]);
	});
});
