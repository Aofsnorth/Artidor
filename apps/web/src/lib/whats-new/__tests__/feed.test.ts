/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
	WHATS_NEW,
	validateWhatsNewFeed,
	getLatestWhatsNewId,
	type WhatsNewEntry,
} from "../feed";

const baseEntry = (id: string, date: string): WhatsNewEntry => ({
	id,
	date,
	title: id,
	tag: "fix",
	items: [id],
});

describe("validateWhatsNewFeed", () => {
	test("accepts newest-first entries with unique ids", () => {
		expect(() =>
			validateWhatsNewFeed([
				baseEntry("new", "2026-06-20"),
				baseEntry("old", "2026-06-19"),
			]),
		).not.toThrow();
	});

	test("rejects duplicate ids", () => {
		expect(() =>
			validateWhatsNewFeed([
				baseEntry("same", "2026-06-20"),
				baseEntry("same", "2026-06-19"),
			]),
		).toThrow("Duplicate What's New id: same");
	});

	test("rejects newer entries below older entries", () => {
		expect(() =>
			validateWhatsNewFeed([
				baseEntry("old", "2026-06-19"),
				baseEntry("new", "2026-06-20"),
			]),
		).toThrow("What's New entries must be newest first");
	});
});

describe("WHATS_NEW feed (real entries)", () => {
	test("the real feed validates without throwing", () => {
		// The module self-validates on import in non-production, but
		// re-run explicitly so a regression is caught with a clear label.
		expect(() => validateWhatsNewFeed()).not.toThrow();
	});

	test("all entries have unique ids", () => {
		const ids = WHATS_NEW.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("the newest entry is the tile effect properties", () => {
		// Guards against accidentally pushing a newer entry above this
		// one without updating the assertion.
		expect(getLatestWhatsNewId()).toBe(
			"2026-07-19-tile-effect-properties",
		);
	});
});
