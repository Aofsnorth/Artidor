import { describe, expect, test } from "bun:test";
import {
	CanvasRenderer,
	clampTextureDimension,
} from "./canvas-renderer";

/**
 * Regression for the permanently-black preview.
 *
 * The preview derives its output size from a quality governor. When that value
 * went degenerate (0 / NaN / runaway) it reached the wasm compositor as a
 * texture dimension, wgpu allocated a staging buffer for the upload, and
 * `createBuffer(mappedAtCreation: true)` threw "size is too large for the
 * implementation". That throw happened inside the compositor's `RefCell` borrow,
 * and because wasm panics do not unwind Rust destructors the borrow was never
 * released — every later frame then died on `RefCell already borrowed`, so the
 * preview was permanently black instead of briefly wrong.
 *
 * These tests pin the guard at the one boundary every GPU-bound dimension
 * passes through.
 */
describe("clampTextureDimension", () => {
	test("keeps sane dimensions untouched", () => {
		expect(clampTextureDimension(1920)).toBe(1920);
		expect(clampTextureDimension(1080)).toBe(1080);
		expect(clampTextureDimension(1)).toBe(1);
		expect(clampTextureDimension(8192)).toBe(8192);
	});

	test("never returns zero or a negative size", () => {
		expect(clampTextureDimension(0)).toBe(1);
		expect(clampTextureDimension(-100)).toBe(1);
	});

	test("contains non-finite values instead of letting them reach the GPU", () => {
		expect(clampTextureDimension(Number.NaN)).toBe(1);
		expect(clampTextureDimension(Number.POSITIVE_INFINITY)).toBe(1);
		expect(clampTextureDimension(Number.NEGATIVE_INFINITY)).toBe(1);
		expect(clampTextureDimension(undefined as unknown as number)).toBe(1);
		expect(clampTextureDimension(null as unknown as number)).toBe(1);
	});

	test("clamps runaway sizes below the GPU staging-buffer limit", () => {
		for (const huge of [1e9, 1e12, 4294967296]) {
			const clamped = clampTextureDimension(huge);
			expect(clamped).toBe(8192);
			// 8192 x 8192 x 4 bytes = 256 MiB, the largest upload wgpu can stage
			// with mappedAtCreation on common implementations.
			expect(clamped * clamped * 4).toBeLessThanOrEqual(256 * 1024 * 1024);
		}
	});

	test("rounds fractional dimensions to whole pixels", () => {
		expect(clampTextureDimension(1920.7)).toBe(1921);
		expect(clampTextureDimension(0.2)).toBe(1);
	});
});

describe("CanvasRenderer never hands degenerate dimensions to the compositor", () => {
	test("constructing with NaN/0 sizes yields usable dimensions", () => {
		const renderer = new CanvasRenderer({
			width: Number.NaN,
			height: 0,
			fps: { numerator: 30, denominator: 1 },
		});
		expect(renderer.width).toBe(1);
		expect(renderer.height).toBe(1);
		expect(renderer.canvasSize.width).toBe(1);
		expect(renderer.canvasSize.height).toBe(1);
	});

	test("setSize clamps before storing", () => {
		const renderer = new CanvasRenderer({
			width: 1920,
			height: 1080,
			fps: { numerator: 30, denominator: 1 },
		});
		renderer.setSize({
			// Finite runaway (not Infinity — non-finite values contain to MIN per
			// the clampTextureDimension contract; the runaway class clamps to MAX).
			width: 1e12,
			height: -50,
			canvasSize: { width: 1e12, height: Number.NaN },
		});
		expect(renderer.width).toBe(8192);
		expect(renderer.height).toBe(1);
		expect(renderer.canvasSize.width).toBe(8192);
		expect(renderer.canvasSize.height).toBe(1);
	});

	test("setSize rejects a degenerate request even when it matches stored state", () => {
		// The no-op fast path must not treat a bad value as "unchanged" just
		// because the same bad value was already stored.
		const renderer = new CanvasRenderer({
			width: Number.NaN,
			height: Number.NaN,
			fps: { numerator: 30, denominator: 1 },
		});
		expect(renderer.width).toBe(1);
		renderer.setSize({ width: Number.NaN, height: Number.NaN });
		expect(renderer.width).toBe(1);
		expect(renderer.height).toBe(1);
	});

	test("setSize is a genuine no-op when nothing changes", () => {
		const renderer = new CanvasRenderer({
			width: 1920,
			height: 1080,
			fps: { numerator: 30, denominator: 1 },
		});
		renderer.setSize({ width: 1920, height: 1080 });
		expect(renderer.width).toBe(1920);
		expect(renderer.height).toBe(1080);
	});
});
