import { describe, expect, test } from "bun:test";
import type { TimelineElement } from "@/lib/timeline";
import { computeResizeNeighborBounds } from "./use-element-resize";

/**
 * Resize neighbour bounds.
 *
 * The three element-list scans used to run on every mousemove; the extracted
 * helper runs once per gesture. It must produce EXACTLY the numbers the old
 * filter/reduce chain produced, because they clamp how far a clip edge can be
 * dragged — an off-by-one here silently corrupts a committed trim.
 *
 * The reference implementation below is the original expression, kept as the
 * oracle.
 */

function clip(
	id: string,
	startTime: number,
	duration: number,
): TimelineElement {
	return {
		id,
		startTime,
		duration,
	} as unknown as TimelineElement;
}

function legacyBounds({
	elements,
	elementId,
	side,
	initialStartTime,
	initialDuration,
}: {
	elements: readonly TimelineElement[];
	elementId: string;
	side: "left" | "right";
	initialStartTime: number;
	initialDuration: number;
}) {
	const otherElements = elements.filter(({ id }) => id !== elementId);
	const initialEndTime = initialStartTime + initialDuration;
	const rightNeighborBound =
		side === "right"
			? otherElements
					.filter(({ startTime }) => startTime >= initialEndTime)
					.reduce(
						(min, { startTime }) => Math.min(min, startTime),
						Infinity,
					)
			: Infinity;
	const leftNeighborBound =
		side === "left"
			? otherElements
					.filter(
						({ startTime, duration }) =>
							startTime + duration <= initialStartTime,
					)
					.reduce(
						(max, { startTime, duration }) =>
							Math.max(max, startTime + duration),
						-Infinity,
					)
			: -Infinity;
	return { rightNeighborBound, leftNeighborBound };
}

// Dragged clip: 100 → 200.
const TARGET = "target";
const ELEMENTS = [
	clip(TARGET, 100, 100),
	clip("before", 0, 60), // ends at 60, before the target starts
	clip("flush-left", 40, 60), // ends exactly at 100
	clip("flush-right", 200, 30), // starts exactly at 200
	clip("later", 500, 10),
];

function bounds(side: "left" | "right") {
	const params = {
		elements: ELEMENTS,
		elementId: TARGET,
		side,
		initialStartTime: 100,
		initialDuration: 100,
	};
	return {
		actual: computeResizeNeighborBounds(params),
		legacy: legacyBounds(params),
	};
}

describe("computeResizeNeighborBounds", () => {
	test("right-edge drag is bounded by the closest later start", () => {
		expect(computeResizeNeighborBounds({
			elements: ELEMENTS,
			elementId: TARGET,
			side: "right",
			initialStartTime: 100,
			initialDuration: 100,
		})).toEqual({ rightNeighborBound: 200, leftNeighborBound: -Infinity });
	});

	test("left-edge drag is bounded by the closest earlier end", () => {
		expect(computeResizeNeighborBounds({
			elements: ELEMENTS,
			elementId: TARGET,
			side: "left",
			initialStartTime: 100,
			initialDuration: 100,
		})).toEqual({ rightNeighborBound: Infinity, leftNeighborBound: 100 });
	});

	test("unbounded when no neighbour qualifies", () => {
		const alone = [clip(TARGET, 0, 10)];
		expect(
			computeResizeNeighborBounds({
				elements: alone,
				elementId: TARGET,
				side: "right",
				initialStartTime: 0,
				initialDuration: 10,
			}),
		).toEqual({ rightNeighborBound: Infinity, leftNeighborBound: -Infinity });
		expect(
			computeResizeNeighborBounds({
				elements: [],
				elementId: TARGET,
				side: "left",
				initialStartTime: 0,
				initialDuration: 10,
			}),
		).toEqual({ rightNeighborBound: Infinity, leftNeighborBound: -Infinity });
	});

	test("the dragged clip is never its own neighbour", () => {
		// The target's own end (200) would be picked up as a right neighbour if
		// it were not excluded, clamping every right-edge drag to zero width.
		const { actual, legacy } = bounds("right");
		expect(actual).toEqual(legacy);
		expect(actual.rightNeighborBound).toBe(200);
	});

	test("matches the previous filter/reduce implementation", () => {
		for (const side of ["left", "right"] as const) {
			const { actual, legacy } = bounds(side);
			expect(actual).toEqual(legacy);
		}
	});
});
