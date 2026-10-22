import { describe, expect, test } from "bun:test";
import { opticalFlowInterpolate } from "@/lib/frame-interpolation/optical-flow";

const WIDTH = 32;
const HEIGHT = 96;

function whiteBlockFrame({
	top,
}: {
	top: number;
}): Uint8ClampedArray {
	const frame = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
	for (let y = top; y < top + 16; y++) {
		for (let x = 0; x < 16; x++) {
			const i = (y * WIDTH + x) * 4;
			frame[i] = 255;
			frame[i + 1] = 255;
			frame[i + 2] = 255;
			frame[i + 3] = 255;
		}
	}
	return frame;
}

function redAt(frame: Uint8ClampedArray, x: number, y: number): number {
	return frame[(y * WIDTH + x) * 4] ?? 0;
}

describe("optical flow on portrait frames", () => {
	test("uses motion from every block row, not just the top band", () => {
		// The white block moves down 8px in the lower half; the top half is
		// static. A field limited to the top band reports zero motion everywhere
		// and would average the two blocks to full white instead of half white.
		const frameA = whiteBlockFrame({ top: 64 });
		const frameB = whiteBlockFrame({ top: 72 });
		const out = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

		opticalFlowInterpolate({
			frameA,
			frameB,
			width: WIDTH,
			height: HEIGHT,
			t: 0.5,
			out,
			radius: 8,
			blockSize: 16,
		});

		// Correct motion moves the white band down to 68..83, so y=70 is
		// covered by both warped blocks (255). The top-band-only bug reports
		// zero motion, leaving the band at 64..87 and y=70 at half grey (127).
		expect(redAt(out, 8, 70)).toBeGreaterThan(200);
		// y=66 is outside the moved band but inside the unshifted one, so it is
		// only black when the lower-row motion vector is actually used.
		expect(redAt(out, 8, 66)).toBeLessThan(50);

		// The static top half stays black.
		expect(redAt(out, 8, 40)).toBe(0);
	});
});