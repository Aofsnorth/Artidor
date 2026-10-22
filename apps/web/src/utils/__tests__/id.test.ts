import { describe, expect, test } from "bun:test";
import { generateUUID } from "../id";

const UUID_V4 =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generateUUID", () => {
	test("prefers crypto.randomUUID when available", () => {
		expect(generateUUID({ randomUUID: () => "fixed-id" })).toBe("fixed-id");
	});

	test("builds a v4 UUID from getRandomValues", () => {
		const uuid = generateUUID({
			getRandomValues: (bytes) => {
				for (let index = 0; index < bytes.length; index++) {
					bytes[index] = index;
				}
				return bytes;
			},
		});
		expect(uuid).toMatch(UUID_V4);
	});

	test("falls back to Math.random when crypto is undefined", () => {
		const uuid = generateUUID(undefined);
		expect(uuid).toMatch(UUID_V4);
	});

	test("falls back when the crypto object lacks both methods", () => {
		const uuid = generateUUID({});
		expect(uuid).toMatch(UUID_V4);
	});

	test("produces unique values", () => {
		const ids = new Set(
			Array.from({ length: 100 }, () => generateUUID(undefined)),
		);
		expect(ids.size).toBe(100);
	});
});
