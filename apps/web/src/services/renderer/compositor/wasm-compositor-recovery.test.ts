/**
 * Recovery-lifecycle regressions for the WASM compositor.
 *
 * Pins the behaviour that keeps long exports alive when the GPU device dies
 * mid-run (driver reset, VRAM exhaustion surfaces as a wgpu panic):
 *
 * 1. A panicking render/upload tears the device down and rebuilds it in the
 *    background on the SAME pinned OffscreenCanvas — the worker's CanvasSource
 *    keeps encoding that canvas, so a rebuild onto a fresh canvas would
 *    silently encode blank frames.
 * 2. `whenRecovered()` resolves only after the rebuild, so the export worker
 *    can wait and re-render the interrupted frame instead of encoding stale
 *    pixels.
 * 3. `releaseForExport()` frees the preview's GPU resources and transparently
 *    rebuilds for the next render — this is what hands the GPU budget to the
 *    export workers on media-heavy projects.
 * 4. Non-GPU errors still propagate (they are logic bugs, not device loss).
 */
import { afterEach, describe, expect, mock, test } from "bun:test";

type CallRecorder = {
	initCompositor: number[];
	initCompositorWithCanvas: unknown[][];
	resizeCompositor: Array<[number, number]>;
	destroyGpu: number;
	destroyCompositor: number;
	initializeGpu: number;
	renderFrame: number[];
	uploadTexture: number[];
	releaseTexture: string[];
	getCompositorCanvas: number;
};

const calls: CallRecorder = {
	initCompositor: [],
	initCompositorWithCanvas: [],
	resizeCompositor: [],
	destroyGpu: 0,
	destroyCompositor: 0,
	initializeGpu: 0,
	renderFrame: [],
	uploadTexture: [],
	releaseTexture: [],
	getCompositorCanvas: 0,
};

let failRenderPanic = false;
let failRenderPlain = false;
let failUploadPanic = false;
let failUploadPlain = false;
let failInitialize = false;

const PANIC = new Error(
	"panicked at wgpu-29.0.4\\src\\backend\\webgpu.rs:2331:63:\ncalled `Result::unwrap()` on an `Err` value: JsValue(RangeError: Failed to execute 'createBuffer' on 'GPUDevice': createBuffer failed, size is too large for the implementation when mappedAtCreation == true",
);

mock.module("artidor-wasm", () => ({
	initializeGpu: () => {
		calls.initializeGpu++;
		return failInitialize
			? Promise.reject(new Error("no adapter"))
			: Promise.resolve();
	},
	destroyGpu: () => {
		calls.destroyGpu++;
	},
	destroyCompositor: () => {
		calls.destroyCompositor++;
	},
	initCompositor: (_width: number, _height: number) => {
		calls.initCompositor.push([_width, _height]);
	},
	initCompositorWithCanvas: (canvas: OffscreenCanvas) => {
		calls.initCompositorWithCanvas.push(canvas);
	},
	getCompositorCanvas: () => {
		calls.getCompositorCanvas++;
		return makeCanvas(640, 360);
	},
	resizeCompositor: (width: number, height: number) => {
		calls.resizeCompositor.push([width, height]);
	},
	renderFrame: (frame: { time: number }) => {
		calls.renderFrame.push(frame.time);
		if (failRenderPanic) throw PANIC;
		if (failRenderPlain) throw new Error("Invalid frame descriptor: bad field");
	},
	uploadTexture: (options: { id: string }) => {
		calls.uploadTexture.push(options.id);
		if (failUploadPanic) throw PANIC;
		if (failUploadPlain) throw new Error("source must be an ImageBitmap");
	},
	releaseTexture: (id: string) => {
		calls.releaseTexture.push(id);
	},
}));

function makeCanvas(width: number, height: number): OffscreenCanvas {
	return { width, height } as OffscreenCanvas;
}

// Import AFTER the module mock is registered.
const { wasmCompositor } = await import("./wasm-compositor");

function resetCalls() {
	calls.initCompositor.length = 0;
	calls.initCompositorWithCanvas.length = 0;
	calls.resizeCompositor.length = 0;
	calls.destroyGpu = 0;
	calls.destroyCompositor = 0;
	calls.initializeGpu = 0;
	calls.renderFrame.length = 0;
	calls.uploadTexture.length = 0;
	calls.releaseTexture.length = 0;
	calls.getCompositorCanvas = 0;
	failRenderPanic = false;
	failRenderPlain = false;
	failUploadPanic = false;
	failUploadPlain = false;
}

afterEach(() => {
	resetCalls();
});

describe("wasm compositor GPU recovery", () => {
	test("render panic rebuilds on the pinned canvas and whenRecovered resolves", async () => {
		const canvas = makeCanvas(1280, 720);
		wasmCompositor.ensureInitializedWithCanvas({
			canvas,
			width: 1280,
			height: 720,
		});
		expect(calls.initCompositorWithCanvas.length).toBe(1);

		// Prime the first successful render so `inRecovery` flips on only via
		// the panic below.
		wasmCompositor.render({ time: 0, width: 1280, height: 720 } as never);
		expect(calls.renderFrame.length).toBe(1);

		failRenderPanic = true;
		wasmCompositor.render({ time: 1, width: 1280, height: 720 } as never);
		// The panicking call itself reached renderFrame (it throws inside), so
		// two frames total reached the WASM boundary so far.
		expect(calls.renderFrame.length).toBe(2);
		expect(wasmCompositor.inRecovery).toBe(true);
		// The teardown must have dropped both runtimes.
		expect(calls.destroyCompositor).toBe(1);
		expect(calls.destroyGpu).toBe(1);

		// While recovery is in flight, renders are dropped silently.
		wasmCompositor.render({ time: 2, width: 1280, height: 720 } as never);
		expect(calls.renderFrame.length).toBe(2);

		await wasmCompositor.whenRecovered();
		expect(wasmCompositor.inRecovery).toBe(false);
		// Rebuilt on the SAME pinned canvas — never a fresh one.
		expect(calls.initCompositorWithCanvas.length).toBe(2);
		expect(calls.initCompositorWithCanvas[1]).toBe(canvas);

		// Renders resume against the rebuilt device.
		wasmCompositor.render({ time: 3, width: 1280, height: 720 } as never);
		expect(calls.renderFrame.length).toBe(3);
	});

	test("releaseForExport tears down and rebuilds lazily", async () => {
		const canvas = makeCanvas(1280, 720);
		wasmCompositor.ensureInitializedWithCanvas({
			canvas,
			width: 1280,
			height: 720,
		});

		wasmCompositor.releaseForExport();
		expect(calls.destroyCompositor).toBe(1);
		expect(calls.destroyGpu).toBe(1);
		await wasmCompositor.whenRecovered();
		expect(wasmCompositor.inRecovery).toBe(false);
		// First init was skipped (the canvas from the previous test is still
		// set on the singleton); the recovery rebuilt onto the pinned canvas.
		expect(calls.initCompositorWithCanvas.length).toBe(1);
		expect(calls.initCompositorWithCanvas[0]).toBe(canvas);
	});

	test("upload panic during syncTextures triggers recovery instead of throwing", async () => {
		const canvas = makeCanvas(1280, 720);
		wasmCompositor.ensureInitializedWithCanvas({
			canvas,
			width: 1280,
			height: 720,
		});
		const source = {} as CanvasImageSource;

		failUploadPanic = true;
		expect(() =>
			wasmCompositor.syncTextures([
				{ id: "tex-a", source, width: 320, height: 200 },
			]),
		).not.toThrow();
		expect(wasmCompositor.inRecovery).toBe(true);
		await wasmCompositor.whenRecovered();
		expect(calls.initCompositorWithCanvas.length).toBe(1);

		// After recovery, the same texture uploads again (bookkeeping cleared).
		wasmCompositor.syncTextures([
			{ id: "tex-a", source, width: 320, height: 200 },
		]);
		expect(calls.uploadTexture.filter((id) => id === "tex-a").length).toBe(2);
	});

	test("plain (non-GPU) errors propagate and never trigger recovery", () => {
		const canvas = makeCanvas(1280, 720);
		wasmCompositor.ensureInitializedWithCanvas({
			canvas,
			width: 1280,
			height: 720,
		});

		failRenderPlain = true;
		expect(() =>
			wasmCompositor.render({ time: 9, width: 1280, height: 720 } as never),
		).toThrow("Invalid frame descriptor");
		expect(wasmCompositor.inRecovery).toBe(false);
		expect(calls.destroyGpu).toBe(0);

		failRenderPlain = false;
		failUploadPlain = true;
		expect(() =>
			wasmCompositor.syncTextures([
				{ id: "tex-b", source: {} as CanvasImageSource, width: 4, height: 4 },
			]),
		).toThrow("source must be an ImageBitmap");
		expect(wasmCompositor.inRecovery).toBe(false);
	});

	test("initializeGpu failure rejects whenRecovered but allows a retry", async () => {
		const canvas = makeCanvas(1280, 720);
		wasmCompositor.ensureInitializedWithCanvas({
			canvas,
			width: 1280,
			height: 720,
		});

		failInitialize = true;
		failRenderPanic = true;
		wasmCompositor.render({ time: 0, width: 1280, height: 720 } as never);
		await wasmCompositor.whenRecovered().catch(() => {});
		expect(wasmCompositor.inRecovery).toBe(true);

		// A later release attempt retries the recovery instead of being stuck.
		failInitialize = false;
		wasmCompositor.releaseForExport();
		await wasmCompositor.whenRecovered();
		expect(wasmCompositor.inRecovery).toBe(false);
		expect(calls.initCompositorWithCanvas.at(-1)).toBe(canvas);
	});
});
