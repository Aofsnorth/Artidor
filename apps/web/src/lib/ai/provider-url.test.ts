import { describe, expect, test } from "bun:test";
import {
	assertSafeProviderBaseUrl,
	assertSafeProviderUrlDns,
	isBlockedOutboundHost,
	isSafeOutboundUrl,
	normalizeProviderBaseUrl,
} from "./provider-url";

async function inProduction<T>(fn: () => T | Promise<T>): Promise<T> {
	const previous = process.env.NODE_ENV;
	process.env.NODE_ENV = "production";
	try {
		return await fn();
	} finally {
		if (previous === undefined) {
			delete process.env.NODE_ENV;
		} else {
			process.env.NODE_ENV = previous;
		}
	}
}

describe("assertSafeProviderBaseUrl — IPv6 literals", () => {
	test("rejects loopback IPv6 in production", async () => {
		await inProduction(() => {
			expect(() =>
				assertSafeProviderBaseUrl({ baseUrl: "http://[::1]" }),
			).toThrow(/local or private networks/);
		});
	});

	test("rejects IPv4-mapped loopback IPv6 in production", async () => {
		await inProduction(() => {
			// WHATWG normalizes this to [::ffff:7f00:1]; both spellings must be
			// treated as 127.0.0.1.
			expect(() =>
				assertSafeProviderBaseUrl({ baseUrl: "http://[::ffff:127.0.0.1]" }),
			).toThrow(/local or private networks/);
		});
	});

	test("rejects IPv4-mapped link-local IPv6 (hex form) in production", async () => {
		await inProduction(() => {
			expect(() =>
				assertSafeProviderBaseUrl({ baseUrl: "http://[::ffff:a9fe:a9fe]" }),
			).toThrow(/local or private networks/);
		});
	});

	test("rejects link-local and unique-local IPv6 in production", async () => {
		await inProduction(() => {
			expect(() =>
				assertSafeProviderBaseUrl({ baseUrl: "http://[fe80::1]" }),
			).toThrow(/local or private networks/);
			expect(() =>
				assertSafeProviderBaseUrl({ baseUrl: "http://[fd00::1]" }),
			).toThrow(/local or private networks/);
		});
	});

	test("allows public IPv6 in production", async () => {
		await inProduction(() => {
			expect(() =>
				assertSafeProviderBaseUrl({
					baseUrl: "https://[2606:4700:4700::1111]",
				}),
			).not.toThrow();
		});
	});

	test("allows loopback when localhost is explicitly permitted", () => {
		expect(() =>
			assertSafeProviderBaseUrl({
				baseUrl: "http://[::1]:11434",
				allowLocalhost: true,
			}),
		).not.toThrow();
	});

	test("normalizeProviderBaseUrl rejects private IPv6 endpoints", async () => {
		await inProduction(() => {
			expect(() =>
				normalizeProviderBaseUrl("http://[::ffff:a9fe:a9fe]/v1"),
			).toThrow(/local or private networks/);
		});
	});
});

describe("assertSafeProviderUrlDns", () => {
	test("skips private-literal checks when localhost is allowed", async () => {
		await expect(
			assertSafeProviderUrlDns(new URL("http://[::1]"), true),
		).resolves.toBeUndefined();
	});

	test("does not attempt DNS for IPv6 literals (brackets stripped)", async () => {
		// Before the fix, `[::1]` failed `isIP()` and hit `lookup()`, which
		// rejects for a bracketed host on some platforms. A literal must be
		// recognized and return immediately.
		await expect(
			assertSafeProviderUrlDns(new URL("http://[2606:4700:4700::1111]"), false),
		).resolves.toBeUndefined();
	});

	test("defaults to the environment's localhost policy", async () => {
		await inProduction(async () => {
			// Public literal: no throw either way, but in production the
			// default must be `allowLocalhost === false` (private literal is
			// handled synchronously and skipped here).
			await expect(
				assertSafeProviderUrlDns(new URL("http://[2606:4700:4700::1111]")),
			).resolves.toBeUndefined();
		});
	});
});

describe("shared outbound-target screening", () => {
	const blocked = [
		"http://[::1]:3000/api",
		"http://[fd00::1]/",
		"http://[fe80::1]/",
		"http://[::ffff:127.0.0.1]/",
		"http://100.64.0.5/",
		"http://localhost:8080/",
		"http://metadata.google.internal/computeMetadata/v1/",
		"http://service.internal/",
		"file:///etc/passwd",
	];

	for (const url of blocked) {
		test(`isSafeOutboundUrl rejects ${url}`, () => {
			expect(isSafeOutboundUrl(url)).toBe(false);
		});
	}

	test("isSafeOutboundUrl allows a public https URL", () => {
		expect(isSafeOutboundUrl("https://example.com/docs")).toBe(true);
	});

	test("isBlockedOutboundHost strips IPv6 brackets before classification", () => {
		expect(isBlockedOutboundHost("[::1]")).toBe(true);
		expect(isBlockedOutboundHost("[2606:4700:4700::1111]")).toBe(false);
	});

	test("assertSafeProviderBaseUrl rejects CGNAT in production", async () => {
		await inProduction(() => {
			expect(() =>
				assertSafeProviderBaseUrl({ baseUrl: "http://100.64.0.5" }),
			).toThrow(/local or private networks/);
		});
	});
});

describe("isBlockedOutboundHost / isSafeOutboundUrl", () => {
	test("blocks bracketed IPv6 literals and IPv4-mapped forms", () => {
		for (const host of [
			"[::1]",
			"[::]",
			"[fd00::1]",
			"[fe80::1]",
			"[::ffff:127.0.0.1]",
			"[::ffff:7f00:1]",
		]) {
			expect(isBlockedOutboundHost(host)).toBe(true);
		}
	});

	test("blocks every private and reserved IPv4 range", () => {
		for (const host of [
			"127.0.0.1",
			"10.1.2.3",
			"172.16.0.1",
			"172.31.255.254",
			"192.168.1.1",
			"169.254.169.254",
			"100.64.0.1", // CGNAT — previously missed
			"0.0.0.0",
			"224.0.0.1",
			"255.255.255.255",
		]) {
			expect(isBlockedOutboundHost(host)).toBe(true);
		}
	});

	test("blocks local and metadata hostnames", () => {
		for (const host of [
			"localhost",
			"app.local",
			"db.internal",
			"metadata.google.internal",
			"metadata.azure.com",
		]) {
			expect(isBlockedOutboundHost(host)).toBe(true);
		}
	});

	test("allows public hosts", () => {
		expect(isBlockedOutboundHost("example.com")).toBe(false);
		expect(isBlockedOutboundHost("api.openai.com")).toBe(false);
		expect(isBlockedOutboundHost("[2606:4700:4700::1111]")).toBe(false);
	});

	test("isSafeOutboundUrl validates scheme and target", () => {
		expect(isSafeOutboundUrl("https://example.com/page")).toBe(true);
		expect(isSafeOutboundUrl("http://example.com")).toBe(true);
		expect(isSafeOutboundUrl("http://[::1]:3000/api")).toBe(false);
		expect(isSafeOutboundUrl("http://100.64.0.5")).toBe(false);
		expect(isSafeOutboundUrl("http://localhost")).toBe(false);
		expect(isSafeOutboundUrl("http://metadata.google.internal/")).toBe(false);
		expect(isSafeOutboundUrl("file:///etc/passwd")).toBe(false);
		expect(isSafeOutboundUrl("not a url")).toBe(false);
	});
});

describe("assertSafeProviderBaseUrl — CGNAT", () => {
	test("rejects 100.64.0.0/10 in production", async () => {
		await inProduction(() => {
			expect(() =>
				assertSafeProviderBaseUrl({ baseUrl: "http://100.64.0.5:8080" }),
			).toThrow(/local or private networks/);
		});
	});
});
