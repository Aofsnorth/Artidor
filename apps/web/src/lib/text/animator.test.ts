import { describe, expect, it } from "bun:test";
import { computeTextUnitAnimation } from "./animator";

describe("computeTextUnitAnimation", () => {
	describe("word-highlight", () => {
		it("dims upcoming words before their start time", () => {
			const state = computeTextUnitAnimation({
				animator: {
					preset: "word-highlight",
					unit: "word",
					duration: 0.5,
					stagger: 0.2,
				},
				unitIndex: 1,
				localTimeSeconds: 0.1,
			});
			expect(state.opacity).toBe(0.5);
		});

		it("shows words at full opacity once their start time is reached", () => {
			const state = computeTextUnitAnimation({
				animator: {
					preset: "word-highlight",
					unit: "word",
					duration: 0.5,
					stagger: 0.2,
				},
				unitIndex: 1,
				localTimeSeconds: 0.25,
			});
			expect(state.opacity).toBe(1);
		});

		it("returns identity transforms for the active word", () => {
			const state = computeTextUnitAnimation({
				animator: {
					preset: "word-highlight",
					unit: "word",
					duration: 0.5,
					stagger: 0.2,
				},
				unitIndex: 0,
				localTimeSeconds: 0,
			});
			expect(state.offsetX).toBe(0);
			expect(state.offsetY).toBe(0);
			expect(state.scale).toBe(1);
			expect(state.rotate).toBe(0);
		});
	});
});
