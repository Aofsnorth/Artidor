import { describe, expect, test } from "bun:test";
import {
	configuredAppOrigins,
	DEFAULT_RELAY_PORT,
	isAllowedOrigin,
	parseRelayPort,
} from "./relay-policy";

describe("parseRelayPort", () => {
	test("uses the default when unset or blank", () => {
		expect(parseRelayPort(undefined)).toBe(DEFAULT_RELAY_PORT);
		expect(parseRelayPort("")).toBe(DEFAULT_RELAY_PORT);
		expect(parseRelayPort("   ")).toBe(DEFAULT_RELAY_PORT);
	});

	test("accepts valid integer ports", () => {
		expect(parseRelayPort("1")).toBe(1);
		expect(parseRelayPort("3005")).toBe(3005);
		expect(parseRelayPort(" 65535 ")).toBe(65535);
	});

	test.each([
		"0",
		"65536",
		"-1",
		"abc",
		"12.5",
		"0x10",
		"1e3",
		"NaN",
	])("rejects %s with a clear message", (value) => {
		expect(() => parseRelayPort(value)).toThrow(/ARTIDOR_MCP_PORT/);
		expect(() => parseRelayPort(value)).toThrow(/1 and 65535/);
	});
});

describe("isAllowedOrigin", () => {
	test("allows native clients that send no Origin", () => {
		expect(isAllowedOrigin({ origin: undefined })).toBe(true);
		expect(isAllowedOrigin({ origin: null })).toBe(true);
		expect(isAllowedOrigin({ origin: "" })).toBe(true);
	});

	test("allows localhost and loopback over http on any port", () => {
		expect(isAllowedOrigin({ origin: "http://localhost:3000" })).toBe(true);
		expect(isAllowedOrigin({ origin: "http://localhost:3005" })).toBe(true);
		expect(isAllowedOrigin({ origin: "http://127.0.0.1:8765" })).toBe(true);
		expect(isAllowedOrigin({ origin: "http://[::1]:3005" })).toBe(true);
	});

	test("allows the desktop shell's Tauri origins", () => {
		expect(isAllowedOrigin({ origin: "http://tauri.localhost" })).toBe(true);
		expect(isAllowedOrigin({ origin: "https://tauri.localhost" })).toBe(true);
		expect(isAllowedOrigin({ origin: "tauri://localhost" })).toBe(true);
	});

	test("allows the configured app origin", () => {
		const appOrigins = ["https://artidor.app"];
		expect(isAllowedOrigin({ origin: "https://artidor.app", appOrigins })).toBe(
			true,
		);
		expect(
			isAllowedOrigin({ origin: "https://artidor.app:8443", appOrigins }),
		).toBe(false);
		expect(
			isAllowedOrigin({ origin: "https://evil.example", appOrigins }),
		).toBe(false);
	});

	test("rejects unknown origins, null origins and bad URLs", () => {
		expect(isAllowedOrigin({ origin: "https://evil.example" })).toBe(false);
		expect(isAllowedOrigin({ origin: "http://192.168.1.10:3000" })).toBe(false);
		expect(isAllowedOrigin({ origin: "https://localhost:3000" })).toBe(false);
		expect(isAllowedOrigin({ origin: "null" })).toBe(false);
		expect(isAllowedOrigin({ origin: "not a url" })).toBe(false);
	});
});

describe("configuredAppOrigins", () => {
	test("normalizes configured http(s) origins and ignores junk", () => {
		const origins = configuredAppOrigins({
			NEXT_PUBLIC_SITE_URL: "https://artidor.app/path?x=1",
			NEXT_PUBLIC_APP_URL: "http://localhost:3000",
			ARTIDOR_APP_ORIGIN: "not-a-url",
		} as NodeJS.ProcessEnv);

		expect(origins).toContain("https://artidor.app");
		expect(origins).toContain("http://localhost:3000");
		expect(origins).not.toContain("not-a-url");
	});
});
