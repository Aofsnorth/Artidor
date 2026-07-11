import { describe, expect, it } from "bun:test";
import { truncateLongStrings } from "./chat-display-helpers";

describe("truncateLongStrings", () => {
	it("leaves short strings untouched", () => {
		expect(truncateLongStrings("hello")).toBe("hello");
	});

	it("summarizes very long strings with their length", () => {
		const long = "a".repeat(600);
		const result = truncateLongStrings(long) as string;
		expect(result.startsWith("aaa…")).toBe(false);
		expect(result).toContain("600 chars");
		expect(result.length).toBeLessThan(250);
	});

	it("recurses through arrays", () => {
		const input = ["short", "b".repeat(600)];
		const result = truncateLongStrings(input) as string[];
		expect(result[0]).toBe("short");
		expect(result[1]).toContain("600 chars");
	});

	it("recurses through objects", () => {
		const input = { name: "short", dataUrl: "x".repeat(600) };
		const result = truncateLongStrings(input) as Record<string, unknown>;
		expect(result.name).toBe("short");
		expect(result.dataUrl).toContain("600 chars");
	});

	it("leaves numbers and booleans alone", () => {
		expect(truncateLongStrings(42)).toBe(42);
		expect(truncateLongStrings(true)).toBe(true);
		expect(truncateLongStrings(null)).toBe(null);
	});
});
