import { describe, expect, test } from "bun:test";
import { validateWhatsNewFeed, type WhatsNewEntry } from "../feed";

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
