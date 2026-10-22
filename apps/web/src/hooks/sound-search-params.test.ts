import { describe, expect, test } from "bun:test";
import { buildSoundSearchParams } from "./sound-search-params";

describe("buildSoundSearchParams", () => {
	test("page 1 always carries the commercial-only filter", () => {
		const params = buildSoundSearchParams({
			query: "whoosh",
			page: 1,
			commercialOnly: true,
		});

		expect(params.get("commercial_only")).toBe("true");
		expect(params.get("page")).toBe("1");
		expect(params.get("type")).toBe("effects");
		expect(params.get("q")).toBe("whoosh");
	});

	test("later pages use the same filter as page 1", () => {
		const params = buildSoundSearchParams({
			query: "whoosh",
			page: 3,
			commercialOnly: false,
		});

		expect(params.get("commercial_only")).toBe("false");
		expect(params.get("page")).toBe("3");
	});

	test("an empty query is omitted instead of sent as a blank search", () => {
		const params = buildSoundSearchParams({
			query: "   ",
			page: 1,
			commercialOnly: false,
		});

		expect(params.has("q")).toBe(false);
	});
});
