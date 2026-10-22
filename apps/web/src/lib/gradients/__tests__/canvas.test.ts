import { describe, expect, test } from "bun:test";
import { drawCssBackground } from "@/lib/gradients/canvas";

type Points = { x0: number; y0: number; x1: number; y1: number };

function linearPoints(css: string): Points {
	let points: Points | null = null;
	const ctx = {
		fillStyle: "",
		createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
			points = { x0, y0, x1, y1 };
			return { addColorStop() {} };
		},
		fillRect() {},
	} as unknown as CanvasRenderingContext2D;

	drawCssBackground({ ctx, width: 100, height: 100, css });
	if (!points) throw new Error(`no linear gradient drawn for ${css}`);
	return points;
}

describe("CSS gradient directions", () => {
	test("legacy start-side keywords point away from that side", () => {
		// `left` is the old spelling of `to right`.
		expect(linearPoints("linear-gradient(left, red, blue)").x1).toBeGreaterThan(
			linearPoints("linear-gradient(left, red, blue)").x0,
		);
		// `bottom` starts at the bottom, so the gradient points up.
		expect(linearPoints("linear-gradient(bottom, red, blue)").y1).toBeLessThan(
			linearPoints("linear-gradient(bottom, red, blue)").y0,
		);
	});

	test("modern `to <side>` keywords are unchanged", () => {
		const right = linearPoints("linear-gradient(to right, red, blue)");
		expect(right.x1).toBeGreaterThan(right.x0);

		const bottom = linearPoints("linear-gradient(to bottom, red, blue)");
		expect(bottom.y1).toBeGreaterThan(bottom.y0);
	});
});