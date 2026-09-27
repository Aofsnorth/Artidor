import { describe, expect, test } from "bun:test";
import { getSourceSpanAtClipTime, splitRetimeAtClipTime } from "@/lib/retime";
import type { RetimeConfig } from "@/lib/timeline";

describe("retime split", () => {
	test("measures source span at a clip time", () => {
		const retime: RetimeConfig = { rate: 2 };
		expect(getSourceSpanAtClipTime({ clipTime: 5, retime })).toBe(10);
	});

	test("returns zero for non-positive clip time", () => {
		expect(getSourceSpanAtClipTime({ clipTime: 0 })).toBe(0);
		expect(getSourceSpanAtClipTime({ clipTime: -1 })).toBe(0);
	});

	test("passes the same retime to both halves when splitting", () => {
		const retime: RetimeConfig = { rate: 1.5 };
		const result = splitRetimeAtClipTime({ retime, splitClipTime: 3 });
		expect(result.left).toBe(retime);
		expect(result.right).toBe(retime);
	});

	test("returns undefined on both sides when no retime", () => {
		const result = splitRetimeAtClipTime({ splitClipTime: 3 });
		expect(result.left).toBeUndefined();
		expect(result.right).toBeUndefined();
	});

	describe("curve split (direct)", () => {
		test("halves renormalize to their own durations with seamless cut rate", () => {
			const retime: RetimeConfig = {
				rate: 1,
				mode: "curve",
				keyframes: [
					{ time: 0, speed: 1 },
					{ time: 1, speed: 3 },
				],
				duration: 100,
			};
			const result = splitRetimeAtClipTime({ retime, splitClipTime: 50 });
			const left = result.left as unknown as {
				keyframes: Array<{ time: number; speed: number }>;
				duration?: number;
			};
			const right = result.right as unknown as {
				keyframes: Array<{ time: number; speed: number }>;
				duration?: number;
			};
			// Each half owns its own clip duration, not the whole.
			expect(left.duration).toBe(50);
			expect(right.duration).toBe(50);
			// Left runs speed(0)->speed(cut); right continues from the cut rate.
			expect(left.keyframes[0]).toEqual({ time: 0, speed: 1 });
			expect(left.keyframes[left.keyframes.length - 1]?.speed).toBeCloseTo(
				2,
				5,
			);
			expect(right.keyframes[0]?.speed).toBeCloseTo(2, 5);
			expect(right.keyframes[right.keyframes.length - 1]).toEqual({
				time: 1,
				speed: 3,
			});
		});

		test("explicit duration param wins over the stored retime.duration", () => {
			const retime: RetimeConfig = {
				rate: 1,
				mode: "curve",
				keyframes: [
					{ time: 0, speed: 1 },
					{ time: 1, speed: 3 },
				],
				duration: 10,
			};
			const result = splitRetimeAtClipTime({
				retime,
				splitClipTime: 50,
				duration: 100,
			});
			// t = 50/100 = 0.5, so the cut rate is 2 — not 50/10 clamped to 1.
			const right = result.right as unknown as {
				keyframes: Array<{ time: number; speed: number }>;
			};
			expect(right.keyframes[0]?.speed).toBeCloseTo(2, 5);
		});

		test("unknown duration keeps both halves on the original config", () => {
			const retime: RetimeConfig = {
				rate: 1,
				mode: "curve",
				keyframes: [
					{ time: 0, speed: 1 },
					{ time: 1, speed: 3 },
				],
			};
			const result = splitRetimeAtClipTime({ retime, splitClipTime: 50 });
			expect(result.left).toBe(retime);
			expect(result.right).toBe(retime);
		});
	});
});
