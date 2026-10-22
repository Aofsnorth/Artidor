import { beforeEach, describe, expect, test } from "bun:test";
import { clearDragData, getDragData, setDragData } from "./drag-data";
import type { TimelineDragData } from "@/lib/timeline/drag";

function fakeDataTransfer(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial));
	return {
		getData: (type: string) => values.get(type) ?? "",
		setData: (type: string, value: string) => {
			values.set(type, value);
		},
		types: [...values.keys()],
	} as unknown as DataTransfer;
}

const MIME = "application/x-timeline-drag";

describe("getDragData", () => {
	beforeEach(() => {
		clearDragData();
	});

	test("returns null for a corrupt custom MIME payload", () => {
		const dataTransfer = fakeDataTransfer({ [MIME]: "{not json" });
		expect(() => getDragData({ dataTransfer })).not.toThrow();
		expect(getDragData({ dataTransfer })).toBeNull();
	});

	test("falls through to a valid text/plain payload", () => {
		const expected: TimelineDragData = {
			id: "a",
			name: "A",
			type: "media",
			mediaType: "image",
		};
		const dataTransfer = fakeDataTransfer({
			[MIME]: "{not json",
			"text/plain": JSON.stringify(expected),
		});

		expect(getDragData({ dataTransfer })).toEqual(expected);
	});

	test("returns the last in-memory payload when external data is bad", () => {
		const expected: TimelineDragData = {
			id: "b",
			name: "B",
			type: "media",
			mediaType: "video",
		};
		setDragData({ dataTransfer: fakeDataTransfer(), dragData: expected });

		expect(getDragData({ dataTransfer: fakeDataTransfer() })).toEqual(expected);
	});

	test("returns null for corrupt text/plain and no prior payload", () => {
		const dataTransfer = fakeDataTransfer({ "text/plain": "{nope" });
		expect(getDragData({ dataTransfer })).toBeNull();
	});
});
