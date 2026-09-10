import { describe, expect, test } from "bun:test";
import {
	buildMultiDragSet,
	resolveMultiDragMoves,
} from "./use-element-interaction";

const MIN = 120_000; // 1s in ticks (test-local scale)

describe("buildMultiDragSet (bughunt R05)", () => {
	test("single selection drags only the primary element", () => {
		const set = buildMultiDragSet({
			selectedElements: [{ trackId: "t1", elementId: "a" }],
			primaryTrackId: "t1",
			primaryElementId: "a",
			primaryStartTime: 2 * MIN,
			getElementStartTime: () => 2 * MIN,
		});
		expect(set.dragElementIds).toEqual(["a"]);
		expect(set.dragTimeOffsets).toEqual({});
	});

	test("multi-selection keeps relative offsets to the primary", () => {
		const starts: Record<string, number> = { a: 2 * MIN, b: 5 * MIN, c: MIN };
		const set = buildMultiDragSet({
			selectedElements: [
				{ trackId: "t1", elementId: "a" },
				{ trackId: "t1", elementId: "b" },
				{ trackId: "t2", elementId: "c" },
			],
			primaryTrackId: "t1",
			primaryElementId: "a",
			primaryStartTime: 2 * MIN,
			getElementStartTime: (ref) => starts[ref.elementId] ?? null,
		});
		expect(set.dragElementIds).toEqual(["a", "b", "c"]);
		expect(set.dragTimeOffsets).toEqual({ b: 3 * MIN, c: -MIN });
	});

	test("dragging an unselected element ignores the selection", () => {
		const set = buildMultiDragSet({
			selectedElements: [
				{ trackId: "t1", elementId: "x" },
				{ trackId: "t1", elementId: "y" },
			],
			primaryTrackId: "t1",
			primaryElementId: "z",
			primaryStartTime: 0,
			getElementStartTime: () => 0,
		});
		expect(set.dragElementIds).toEqual(["z"]);
		expect(set.dragTimeOffsets).toEqual({});
	});

	test("stale selection refs are skipped, not crashed on", () => {
		const set = buildMultiDragSet({
			selectedElements: [
				{ trackId: "t1", elementId: "a" },
				{ trackId: "t9", elementId: "ghost" },
			],
			primaryTrackId: "t1",
			primaryElementId: "a",
			primaryStartTime: MIN,
			getElementStartTime: (ref) => (ref.elementId === "a" ? MIN : null),
		});
		expect(set.dragElementIds).toEqual(["a"]);
		expect(set.dragTimeOffsets).toEqual({});
	});
});

describe("resolveMultiDragMoves (bughunt R05)", () => {
	test("siblings shift by the same snapped delta", () => {
		const moves = resolveMultiDragMoves({
			snappedTime: 5 * MIN,
			dragElementIds: ["a", "b", "c"],
			primaryElementId: "a",
			dragTimeOffsets: { b: 3 * MIN, c: -MIN },
		});
		expect(moves).toEqual([
			{ elementId: "b", newStartTime: 8 * MIN },
			{ elementId: "c", newStartTime: 4 * MIN },
		]);
	});

	test("sibling moves clamp at zero instead of going negative", () => {
		const moves = resolveMultiDragMoves({
			snappedTime: 0,
			dragElementIds: ["a", "b"],
			primaryElementId: "a",
			dragTimeOffsets: { b: -MIN },
		});
		expect(moves).toEqual([{ elementId: "b", newStartTime: 0 }]);
	});

	test("missing offsets default to zero (move in lock-step)", () => {
		const moves = resolveMultiDragMoves({
			snappedTime: 5 * MIN,
			dragElementIds: ["a", "b"],
			primaryElementId: "a",
			dragTimeOffsets: {},
		});
		expect(moves).toEqual([{ elementId: "b", newStartTime: 5 * MIN }]);
	});
});
