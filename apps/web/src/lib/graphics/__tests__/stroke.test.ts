import { describe, expect, test } from "bun:test";
import { applyAlignedStroke } from "@/lib/graphics/stroke";

function createFakeContext() {
	const state = {
		strokeStyle: "sentinel-stroke",
		lineWidth: 7,
		lineCap: "butt" as CanvasLineCap,
		globalAlpha: 0.4,
		lineDash: [9, 9] as number[],
	};
	const stack: Array<typeof state> = [];
	const ctx = {
		get strokeStyle() {
			return state.strokeStyle;
		},
		set strokeStyle(value: string) {
			state.strokeStyle = value;
		},
		get lineWidth() {
			return state.lineWidth;
		},
		set lineWidth(value: number) {
			state.lineWidth = value;
		},
		get lineCap() {
			return state.lineCap;
		},
		set lineCap(value: CanvasLineCap) {
			state.lineCap = value;
		},
		get globalAlpha() {
			return state.globalAlpha;
		},
		set globalAlpha(value: number) {
			state.globalAlpha = value;
		},
		setLineDash(value: number[]) {
			state.lineDash = value;
		},
		stroke() {},
		save() {
			stack.push({ ...state, lineDash: [...state.lineDash] });
		},
		restore() {
			const previous = stack.pop();
			if (previous) Object.assign(state, previous);
		},
	};
	return { ctx, state };
}

describe("applyAlignedStroke", () => {
	test("restores canvas style state after drawing", () => {
		const { ctx, state } = createFakeContext();

		applyAlignedStroke({
			ctx: ctx as unknown as CanvasRenderingContext2D,
			path: {} as Path2D,
			strokeWidth: 4,
			strokeAlign: "center",
			strokeColor: "#ff0000",
			strokeOpacity: 0.5,
			strokeDash: "dashed",
			strokeTaper: "in",
		});

		expect(state).toEqual({
			strokeStyle: "sentinel-stroke",
			lineWidth: 7,
			lineCap: "butt",
			globalAlpha: 0.4,
			lineDash: [9, 9],
		});
	});
});