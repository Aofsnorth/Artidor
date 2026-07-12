import { describe, expect, test } from "bun:test";
import { getExportWorkerActivityTimeout } from "./export-worker-bridge";

describe("getExportWorkerActivityTimeout", () => {
	test("disables timeout when configured timeout is non-positive", () => {
		expect(
			getExportWorkerActivityTimeout({
				timeoutMs: 0,
				hasReceivedMessage: false,
			}),
		).toBe(0);
	});

	test("caps the first worker message wait at ten seconds", () => {
		expect(
			getExportWorkerActivityTimeout({
				timeoutMs: 60_000,
				hasReceivedMessage: false,
			}),
		).toBe(10_000);
	});

	test("uses the configured inactivity timeout after worker activity", () => {
		expect(
			getExportWorkerActivityTimeout({
				timeoutMs: 60_000,
				hasReceivedMessage: true,
			}),
		).toBe(60_000);
	});
});
