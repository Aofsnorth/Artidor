import { expect, test } from "bun:test";
import { translate } from "./dictionaries";

test("translate falls back to English", () => {
	expect(translate({ locale: "id", key: "editor.projectDetails" })).toBe(
		"Detail proyek",
	);
	expect(translate({ locale: "id", key: "editor.unknown" })).toBe(
		"editor.unknown",
	);
});

test("translate interpolates values", () => {
	expect(
		translate({ locale: "en", key: "timeline.tracks", values: { count: 2 } }),
	).toBe("2 tracks");
});
