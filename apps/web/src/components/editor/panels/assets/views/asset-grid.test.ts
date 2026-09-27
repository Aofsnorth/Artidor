/**
 * `VirtualAssetGrid` only mounts the rows inside the panel's scroll
 * viewport. The hidden rows become two spacer grid rows, so the arithmetic
 * in `computeVirtualGridWindow` has to reproduce the *exact* scroll height
 * of the un-windowed CSS grid — otherwise the panel scrollbar would shrink
 * or grow every time a row was mounted, and the user's scroll position would
 * jump. These tests pin that invariant, which is the one thing that cannot
 * be eyeballed from a screenshot.
 */
import { describe, expect, test } from "bun:test";
import { computeGridSpacers, computeVirtualGridWindow } from "./asset-grid";

const COLUMN_COUNT = 3;
const ROW_HEIGHT = 100;
const ROW_GAP = 10;
const OVERSCAN_ROWS = 2;

/** Scroll height the plain (un-windowed) grid produces for `itemCount` items. */
function expectedScrollHeight(itemCount: number, columnCount: number): number {
	const rows = Math.max(1, Math.ceil(itemCount / columnCount));
	return rows * ROW_HEIGHT + (rows - 1) * ROW_GAP;
}

/** Total height of the windowed grid, spacers included. */
function windowedScrollHeight(
	window: ReturnType<typeof computeVirtualGridWindow>,
	columnCount: number,
): number {
	const mountedRows = Math.ceil(
		(window.lastIndex + 1 - window.firstIndex) / columnCount,
	);
	const spacerRows =
		(window.topSpacer > 0 ? 1 : 0) + (window.bottomSpacer > 0 ? 1 : 0);
	const rows = mountedRows + spacerRows;
	return (
		window.topSpacer +
		window.bottomSpacer +
		mountedRows * ROW_HEIGHT +
		(rows - 1) * ROW_GAP
	);
}

describe("computeVirtualGridWindow", () => {
	test("keeps the un-windowed scroll height at every scroll position", () => {
		const itemCount = 217;
		const expected = expectedScrollHeight(itemCount, COLUMN_COUNT);
		const viewportHeight = 640;

		for (let scrollOffset = 0; scrollOffset < expected; scrollOffset += 37) {
			const window = computeVirtualGridWindow({
				itemCount,
				columnCount: COLUMN_COUNT,
				rowHeight: ROW_HEIGHT,
				rowGap: ROW_GAP,
				overscanRows: OVERSCAN_ROWS,
				scrollOffset,
				viewportHeight,
			});
			expect(
				windowedScrollHeight(window, COLUMN_COUNT),
			).toBe(expected);
		}
	});

	test("keeps the scroll height when only one side has hidden rows", () => {
		const itemCount = 60;
		const expected = expectedScrollHeight(itemCount, COLUMN_COUNT);
		const bottomOffset = expected;

		const atTop = computeVirtualGridWindow({
			itemCount,
			columnCount: COLUMN_COUNT,
			rowHeight: ROW_HEIGHT,
			rowGap: ROW_GAP,
			overscanRows: OVERSCAN_ROWS,
			scrollOffset: 0,
			viewportHeight: 300,
		});
		expect(atTop.topSpacer).toBe(0);
		expect(atTop.firstIndex).toBe(0);
		expect(windowedScrollHeight(atTop, COLUMN_COUNT)).toBe(expected);

		const atBottom = computeVirtualGridWindow({
			itemCount,
			columnCount: COLUMN_COUNT,
			rowHeight: ROW_HEIGHT,
			rowGap: ROW_GAP,
			overscanRows: OVERSCAN_ROWS,
			scrollOffset: bottomOffset,
			viewportHeight: 300,
		});
		expect(atBottom.bottomSpacer).toBe(0);
		expect(atBottom.lastIndex).toBe(itemCount - 1);
		expect(windowedScrollHeight(atBottom, COLUMN_COUNT)).toBe(
			expected,
		);
	});

	test("mounts only a small window of a large catalog", () => {
		const window = computeVirtualGridWindow({
			itemCount: 217,
			columnCount: COLUMN_COUNT,
			rowHeight: ROW_HEIGHT,
			rowGap: ROW_GAP,
			overscanRows: OVERSCAN_ROWS,
			scrollOffset: 0,
			viewportHeight: 300,
		});
		const mounted = window.lastIndex - window.firstIndex + 1;
		// 300px viewport / 110px row stride = 3 visible rows, + 2 overscan
		// rows below => 5 rows x 3 columns.
		expect(mounted).toBe(15);
		expect(mounted).toBeLessThan(217);
	});

	test("keeps the whole viewport covered plus overscan at every offset", () => {
		const itemCount = 207;
		const rowStride = ROW_HEIGHT + ROW_GAP;
		const viewportHeight = 640;

		for (let scrollOffset = 0; scrollOffset < 4000; scrollOffset += 41) {
			const window = computeVirtualGridWindow({
				itemCount,
				columnCount: COLUMN_COUNT,
				rowHeight: ROW_HEIGHT,
				rowGap: ROW_GAP,
				overscanRows: OVERSCAN_ROWS,
				scrollOffset,
				viewportHeight,
			});
			// The mounted band, in the grid's own coordinate space: the rows
			// hidden above the viewport live in the top spacer, so the first
			// mounted row sits at `firstRow * rowStride`.
			const firstRow = window.firstIndex / COLUMN_COUNT;
			const lastRow = (window.lastIndex + 1) / COLUMN_COUNT - 1;
			const mountedTop = firstRow * rowStride;
			const mountedBottom = (lastRow + 1) * rowStride - ROW_GAP;
			// Nothing inside the viewport may be missing: the top and bottom
			// partially-scrolled rows have to be mounted.
			expect(mountedTop).toBeLessThanOrEqual(scrollOffset);
			expect(mountedBottom).toBeGreaterThanOrEqual(
				scrollOffset + viewportHeight - ROW_GAP,
			);
			// ...plus at least one overscan row on each side (clamped at the
			// ends of the list, where there is nothing more to overscan).
			expect(mountedTop).toBeLessThanOrEqual(
				Math.max(
					0,
					Math.floor(scrollOffset / rowStride - OVERSCAN_ROWS) * rowStride,
				),
			);
			expect(mountedBottom).toBeGreaterThanOrEqual(
				scrollOffset + viewportHeight,
			);
		}
	});

	test("never returns an empty or out-of-range window", () => {
		const window = computeVirtualGridWindow({
			itemCount: 1,
			columnCount: COLUMN_COUNT,
			rowHeight: ROW_HEIGHT,
			rowGap: ROW_GAP,
			overscanRows: OVERSCAN_ROWS,
			scrollOffset: 5000,
			viewportHeight: 640,
		});
		expect(window.firstIndex).toBe(0);
		expect(window.lastIndex).toBe(0);
		expect(window.topSpacer).toBe(0);
		expect(window.bottomSpacer).toBe(0);
	});

	test("empty catalog mounts nothing", () => {
		const window = computeVirtualGridWindow({
			itemCount: 0,
			columnCount: COLUMN_COUNT,
			rowHeight: ROW_HEIGHT,
			rowGap: ROW_GAP,
			overscanRows: OVERSCAN_ROWS,
			scrollOffset: 0,
			viewportHeight: 640,
		});
		expect(window.lastIndex).toBe(-1);
		expect(window.topSpacer).toBe(0);
		expect(window.bottomSpacer).toBe(0);
	});

	test("an empty window never grows a spacer", () => {
		expect(
			computeGridSpacers({
				firstRow: 0,
				lastRow: -1,
				totalRows: 1,
				rowHeight: ROW_HEIGHT,
				rowGap: ROW_GAP,
			}),
		).toEqual({ topSpacer: 0, bottomSpacer: 0 });
	});
});
