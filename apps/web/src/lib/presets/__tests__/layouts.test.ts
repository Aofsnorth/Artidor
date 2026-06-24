import { describe, expect, test } from "bun:test";
import {
	BUILTIN_LAYOUT_PRESETS,
	computeTransformForSlot,
	getBuiltinLayoutPreset,
	resolveLayoutSlots,
} from "../layouts";

const CANVAS_16_9 = { width: 1920, height: 1080 };
const CANVAS_9_16 = { width: 1080, height: 1920 };

describe("resolveLayoutSlots", () => {
	test("grid 2x2 produces four equal quadrants covering the whole canvas", () => {
		const slots = resolveLayoutSlots({
			canvas: CANVAS_16_9,
			preset: { ...BUILTIN_LAYOUT_PRESETS[2], gap: 0, padding: 0 },
		});
		expect(slots.length).toBe(4);
		expect(slots[0]).toEqual({ x: 0, y: 0, width: 960, height: 540 });
		expect(slots[1]).toEqual({ x: 960, y: 0, width: 960, height: 540 });
		expect(slots[2]).toEqual({ x: 0, y: 540, width: 960, height: 540 });
		expect(slots[3]).toEqual({ x: 960, y: 540, width: 960, height: 540 });
	});

	test("grid 2x3 with gap of 4px splits horizontally with 4px gutters", () => {
		const slots = resolveLayoutSlots({
			canvas: CANVAS_16_9,
			preset: { ...BUILTIN_LAYOUT_PRESETS[3], gap: 4 },
		});
		expect(slots.length).toBe(6);
		// Two rows of three cols; cell width = (1920 - 2*4) / 3 = 637.333...
		const cellW = (1920 - 2 * 4) / 3;
		const cellH = (1080 - 1 * 4) / 2;
		expect(slots[0].x).toBe(0);
		expect(slots[1].x).toBeCloseTo(cellW + 4, 5);
		expect(slots[2].x).toBeCloseTo((cellW + 4) * 2, 5);
		expect(slots[3].y).toBeCloseTo(cellH + 4, 5);
	});

	test("horizontal 1x2 (rows=1, cols=2) gives 2 vertical strips", () => {
		const slots = resolveLayoutSlots({
			canvas: CANVAS_16_9,
			preset: { ...BUILTIN_LAYOUT_PRESETS[1] }, // 2×1 horizontal
		});
		expect(slots.length).toBe(2);
		expect(slots[0]).toEqual({ x: 0, y: 0, width: 960, height: 1080 });
		expect(slots[1]).toEqual({ x: 960, y: 0, width: 960, height: 1080 });
	});

	test("vertical 1x2 (rows=2, cols=1) gives 2 horizontal strips", () => {
		const slots = resolveLayoutSlots({
			canvas: CANVAS_16_9,
			preset: { ...BUILTIN_LAYOUT_PRESETS[0] }, // 1×2 vertical
		});
		expect(slots.length).toBe(2);
		expect(slots[0]).toEqual({ x: 0, y: 0, width: 1920, height: 540 });
		expect(slots[1]).toEqual({ x: 0, y: 540, width: 1920, height: 540 });
	});

	test("pip with mainHeightShare=0.66 puts main slot at top 66% and PiP below", () => {
		const slots = resolveLayoutSlots({
			canvas: CANVAS_16_9,
			preset: {
				id: "test.pip",
				mode: "pip",
				rows: 1,
				cols: 2,
				gap: 0,
				mainHeightShare: 0.66,
			},
		});
		expect(slots.length).toBe(3);
		const mainH = 1080 * 0.66;
		expect(slots[0]).toEqual({
			x: 0,
			y: 0,
			width: 1920,
			height: mainH,
		});
		expect(slots[1].y).toBeCloseTo(mainH, 5);
		expect(slots[2].y).toBeCloseTo(mainH, 5);
	});

	test("padding shrinks each slot by padding on all sides", () => {
		const slots = resolveLayoutSlots({
			canvas: CANVAS_16_9,
			preset: {
				id: "test.padded",
				mode: "grid",
				rows: 1,
				cols: 1,
				padding: 10,
			},
		});
		expect(slots[0]).toEqual({
			x: 10,
			y: 10,
			width: 1920 - 20,
			height: 1080 - 20,
		});
	});

	test("throws on zero or negative canvas", () => {
		expect(() =>
			resolveLayoutSlots({
				canvas: { width: 0, height: 100 },
				preset: { id: "x", mode: "grid", rows: 1, cols: 1 },
			}),
		).toThrow(/canvas must be positive/);
	});

	test("throws on invalid mode", () => {
		expect(() =>
			resolveLayoutSlots({
				canvas: CANVAS_16_9,
				preset: {
					id: "x",
					mode: "diagonal" as never,
					rows: 1,
					cols: 1,
				},
			}),
		).toThrow(/unknown mode/);
	});

	test("works on a 9:16 portrait canvas", () => {
		const slots = resolveLayoutSlots({
			canvas: CANVAS_9_16,
			preset: { ...BUILTIN_LAYOUT_PRESETS[2], gap: 0 }, // 2×2
		});
		expect(slots[0]).toEqual({ x: 0, y: 0, width: 540, height: 960 });
		expect(slots[3]).toEqual({ x: 540, y: 960, width: 540, height: 960 });
	});
});

describe("computeTransformForSlot", () => {
	test("slot in canvas centre yields position offset of (0, 0)", () => {
		const transform = computeTransformForSlot({
			slot: { x: 480, y: 270, width: 960, height: 540 },
			canvas: CANVAS_16_9,
		});
		expect(transform.position.x).toBe(0);
		expect(transform.position.y).toBe(0);
	});

	test("slot at top-left produces negative position offset", () => {
		const transform = computeTransformForSlot({
			slot: { x: 0, y: 0, width: 960, height: 540 },
			canvas: CANVAS_16_9,
		});
		// Slot centre is (480, 270); canvas centre is (960, 540); offset = (-480, -270).
		expect(transform.position.x).toBe(-480);
		expect(transform.position.y).toBe(-270);
	});

	test("stretch fit makes scaleX/scaleY proportional to slot/canvas ratio", () => {
		const transform = computeTransformForSlot({
			slot: { x: 0, y: 0, width: 1920, height: 1080 },
			canvas: CANVAS_16_9,
			fit: "stretch",
		});
		// Stretch of full canvas = fill the canvas → element is at full
		// canvas size after contain (which is 1:1 for 16:9 on 16:9).
		expect(transform.scaleX).toBeCloseTo(1, 5);
		expect(transform.scaleY).toBeCloseTo(1, 5);
	});

	test("half-canvas slot produces half-canvas scale", () => {
		const transform = computeTransformForSlot({
			slot: { x: 0, y: 0, width: 960, height: 540 },
			canvas: CANVAS_16_9,
			fit: "stretch",
		});
		expect(transform.scaleX).toBeCloseTo(0.5, 5);
		expect(transform.scaleY).toBeCloseTo(0.5, 5);
	});

	test("rotation is preserved", () => {
		const transform = computeTransformForSlot({
			slot: { x: 0, y: 0, width: 960, height: 540 },
			canvas: CANVAS_16_9,
			existingRotation: 45,
		});
		expect(transform.rotate).toBe(45);
	});

	test("contain fit on a non-square source uses letterbox math", () => {
		// Slot is wider than a 4:3 source can fill without distortion.
		const transform = computeTransformForSlot({
			slot: { x: 0, y: 0, width: 1920, height: 1080 },
			canvas: CANVAS_16_9,
			elementAspect: 4 / 3,
			fit: "contain",
		});
		// For a 4:3 source on a 16:9 slot, contain shrinks to fit width
		// → height < slot.height. We just check it's positive and bounded.
		expect(transform.scaleX).toBeGreaterThan(0);
		expect(transform.scaleY).toBeGreaterThan(0);
	});
});

describe("BUILTIN_LAYOUT_PRESETS", () => {
	test("all presets have unique ids", () => {
		const ids = BUILTIN_LAYOUT_PRESETS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("all presets have positive rows and cols", () => {
		for (const preset of BUILTIN_LAYOUT_PRESETS) {
			expect(preset.rows).toBeGreaterThan(0);
			expect(preset.cols).toBeGreaterThan(0);
		}
	});

	test("all presets resolve to the expected number of slots", () => {
		const canvas = CANVAS_16_9;
		for (const preset of BUILTIN_LAYOUT_PRESETS) {
			const expectedSlots =
				preset.mode === "pip"
					? 1 + preset.rows * preset.cols
					: preset.rows * preset.cols;
			const slots = resolveLayoutSlots({
				canvas,
				preset: { ...preset, gap: 0, padding: 0 },
			});
			expect(slots.length).toBe(expectedSlots);
		}
	});

	test("getBuiltinLayoutPreset returns the preset by id or null", () => {
		expect(getBuiltinLayoutPreset({ id: "layout.grid.2x2" })?.id).toBe(
			"layout.grid.2x2",
		);
		expect(getBuiltinLayoutPreset({ id: "does.not.exist" })).toBeNull();
	});
});