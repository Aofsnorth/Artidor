import { afterAll, describe, expect, mock, test } from "bun:test";

mock.module("@/lib/env/web", () => ({
	webEnv: { FREESOUND_API_KEY: "test-key" },
	isEnvMissing: false,
}));
mock.module("@/lib/rate-limit", () => ({
	checkRateLimit: async () => ({ limited: false }),
}));
mock.module("@/lib/auth/require-auth", () => ({
	getOptionalSession: async () => ({ user: { id: "test" } }),
}));

const { commercialOnlySchema } = await import("./route");

afterAll(() => {
	mock.restore();
});

describe("commercialOnlySchema", () => {
	test("parses the string 'false' as false", () => {
		expect(commercialOnlySchema.parse("false")).toBe(false);
		expect(commercialOnlySchema.parse("0")).toBe(false);
	});

	test("parses the string 'true' as true", () => {
		expect(commercialOnlySchema.parse("true")).toBe(true);
		expect(commercialOnlySchema.parse("1")).toBe(true);
	});

	test("defaults to true when omitted", () => {
		expect(commercialOnlySchema.parse(undefined)).toBe(true);
	});

	test("rejects non-boolean spellings", () => {
		expect(() => commercialOnlySchema.parse("yes")).toThrow();
		expect(() => commercialOnlySchema.parse("FALSE")).toThrow();
	});
});
