import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { effectPreviewService } from "./effect-preview";

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
