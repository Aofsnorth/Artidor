import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
	clearEffectPreviewCache,
	effectPreviewResultCache,
	effectPreviewService,
	getEffectPreviewCacheKey,
	getEffectPreviewDedupeHits,
} from "./effect-preview";

const serviceSource = readFileSync(
	`${import.meta.dir}/effect-preview.ts`,
	"utf8",
);
const scheduledCallbacks: Array<() => void> = [];
const originalRequestIdleCallback = globalThis.requestIdleCallback;

function waitForScheduledWork(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
	scheduledCallbacks.length = 0;
	globalThis.requestIdleCallback = originalRequestIdleCallback;
	clearEffectPreviewCache();
	effectPreviewService.previewSourceForTest = null;
});

describe("effect preview scheduling @fast @regression", () => {
	test("runs every visible job exactly once", async () => {
		let runCount = 0;

		effectPreviewService.scheduleRender({
			run: () => {
				runCount += 1;
			},
			priority: -1,
		});
		await waitForScheduledWork();

		expect(runCount).toBe(1);
	});

	test("waits for browser idle time before running deferred work", async () => {
		globalThis.requestIdleCallback = ((callback: IdleRequestCallback) => {
			scheduledCallbacks.push(() =>
				callback({ didTimeout: false, timeRemaining: () => 10 }),
			);
			return scheduledCallbacks.length;
		}) as typeof requestIdleCallback;
		let runCount = 0;

		effectPreviewService.scheduleRender({
			run: () => {
				runCount += 1;
			},
			priority: 1,
		});
		await waitForScheduledWork();
		expect(runCount).toBe(0);
		expect(scheduledCallbacks).toHaveLength(1);

		scheduledCallbacks.shift()?.();
		await waitForScheduledWork();
		expect(runCount).toBe(1);
	});

	test("does not force effect-card GPU output through a pixel readback", () => {
		expect(serviceSource).not.toContain("targetCtx.getImageData(");
	});

	test("coalesces duplicate (effect+params) requests via the cache key", () => {
		const fakeSource = {} as unknown as CanvasImageSource;
		const fakeTarget = {
			width: 0,
			height: 0,
			getContext: () => ({
				clearRect: () => {},
				drawImage: () => {},
			}),
		} as unknown as HTMLCanvasElement;
		effectPreviewService.previewSourceForTest = () => fakeSource;

		const stubKey = getEffectPreviewCacheKey({
			effectType: "blur",
			params: {},
			width: 160,
			height: 160,
			uniformWidth: 160,
			uniformHeight: 160,
		});
		const stubBitmap = {} as unknown as CanvasImageSource;
		effectPreviewResultCache.set(stubKey, stubBitmap);
		const hitsBefore = getEffectPreviewDedupeHits();

		const outcomes = [
			effectPreviewService.renderPreview({
				effectType: "blur",
				params: {},
				targetCanvas: fakeTarget,
			}),
			effectPreviewService.renderPreview({
				effectType: "blur",
				params: {},
				targetCanvas: fakeTarget,
			}),
			effectPreviewService.renderPreview({
				effectType: "blur",
				params: {},
				targetCanvas: fakeTarget,
			}),
		];

		// All three repeats served from cache: 3 re-renders avoided
		// (no GPU passes resolved — renderPreview short-circuits before
		// touching `resolveEffectPasses` / `gpuRenderer`).
		expect(outcomes.every((o) => o.rendered && !o.usedFallback)).toBe(true);
		expect(getEffectPreviewDedupeHits() - hitsBefore).toBe(3);
	});

	test("keys differ across params sizes so no card reuses a wrong bitmap", () => {
		const base = {
			effectType: "blur",
			width: 160,
			height: 160,
			uniformWidth: 160,
			uniformHeight: 160,
		};
		const a = getEffectPreviewCacheKey({ ...base, params: { x: 1, y: 2 } });
		// Insertion order must not matter ({} vs reversed-spread literals
		// hit the same bitmap).
		const reordered = getEffectPreviewCacheKey({
			...base,
			params: { y: 2, x: 1 },
		});
		const differentParam = getEffectPreviewCacheKey({
			...base,
			params: { x: 1, y: 3 },
		});
		const differentUniforms = getEffectPreviewCacheKey({
			...base,
			params: { x: 1, y: 2 },
			uniformWidth: 1920,
			uniformHeight: 1080,
		});
		expect(a).toBe(reordered);
		expect(a).not.toBe(differentParam);
		expect(a).not.toBe(differentUniforms);
	});

	test("reports a failed render instead of claiming success when the 2d context is missing", () => {
		const fakeCanvas = {
			width: 0,
			height: 0,
			getContext: () => null,
		} as unknown as HTMLCanvasElement;

		const outcome = effectPreviewService.renderPreview({
			effectType: "blur",
			params: {},
			targetCanvas: fakeCanvas,
		});

		expect(outcome.rendered).toBe(false);
	});
});
