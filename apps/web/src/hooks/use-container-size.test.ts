/**
 * `useContainerSize` guards against no-op ResizeObserver ticks. The guard is
 * the pure `nextContainerSize` reducer, pinned here: it must return the
 * PREVIOUS object (not an equal copy) when width/height are unchanged, because
 * that identity is what keeps the consumer from re-rendering and from
 * invalidating memoised children keyed on the size object.
 */
import { describe, expect, test } from "bun:test";
import { nextContainerSize } from "./use-container-size";

describe("useContainerSize: no-op resize guard", () => {
	test("unchanged size returns the previous object identity", () => {
		const previous = { width: 800, height: 600 };
		const next = nextContainerSize(previous, 800, 600);
		expect(next).toBe(previous);
	});

	test("a changed width or height produces a new object", () => {
		const previous = { width: 800, height: 600 };
		const resized = nextContainerSize(previous, 801, 600);
		expect(resized).not.toBe(previous);
		expect(resized).toEqual({ width: 801, height: 600 });

		const taller = nextContainerSize(previous, 800, 601);
		expect(taller).not.toBe(previous);
		expect(taller).toEqual({ width: 800, height: 601 });
	});

	test("the initial 0x0 state transitions to the measured box", () => {
		const initial = { width: 0, height: 0 };
		const measured = nextContainerSize(initial, 1280, 720);
		expect(measured).toEqual({ width: 1280, height: 720 });
		expect(measured).not.toBe(initial);
	});

	test("repeated identical ticks keep identity stable", () => {
		const initial = { width: 0, height: 0 };
		const first = nextContainerSize(initial, 640, 480);
		const second = nextContainerSize(first, 640, 480);
		const third = nextContainerSize(second, 640, 480);
		expect(second).toBe(first);
		expect(third).toBe(first);
	});
});
