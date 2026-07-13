import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	getExportRenderQueueDepth,
	waitForWorkerGpuReady,
} from "./export-performance";

describe("waitForWorkerGpuReady", () => {
	test("launches the next worker as soon as GPU initialization completes", async () => {
		let signalReady: (() => void) | undefined;
		const ready = new Promise<void>((resolve) => {
			signalReady = resolve;
		});

		signalReady?.();
		const started = performance.now();
		await waitForWorkerGpuReady(ready, 1_000);
		expect(performance.now() - started).toBeLessThan(100);
	});

	test("uses the fallback delay when no GPU-ready signal arrives", async () => {
		const started = performance.now();
		await waitForWorkerGpuReady(new Promise<void>(() => {}), 5);
		expect(performance.now() - started).toBeGreaterThanOrEqual(4);
	});
});

describe("getExportRenderQueueDepth", () => {
	let originalHardwareConcurrency: number | undefined;

	beforeEach(() => {
		originalHardwareConcurrency =
			typeof navigator !== "undefined"
				? navigator.hardwareConcurrency
				: undefined;
		if (typeof navigator !== "undefined") {
			navigator.hardwareConcurrency = 2;
		}
	});

	afterEach(() => {
		if (
			typeof navigator !== "undefined" &&
			originalHardwareConcurrency !== undefined
		) {
			navigator.hardwareConcurrency = originalHardwareConcurrency;
		}
	});

	test("uses a deep queue at 1080p", () => {
		expect(getExportRenderQueueDepth({ width: 1920, height: 1080 })).toBe(8);
	});

	test("limits retained frames at 4K", () => {
		expect(getExportRenderQueueDepth({ width: 3840, height: 2160 })).toBe(6);
	});

	test("uses the minimum queue above 4K", () => {
		expect(getExportRenderQueueDepth({ width: 7680, height: 4320 })).toBe(3);
	});

	test("returns a positive queue depth for 1080p", () => {
		const depth = getExportRenderQueueDepth({ width: 1920, height: 1080 });
		expect(depth).toBeGreaterThan(0);
	});
});
