"use client";

import {
	Fragment,
	type ReactNode,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { cn } from "@/utils/ui";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

/**
 * Shared responsive grid for asset-library views. Every view used to inline
 * the same `repeat(auto-fill, minmax(<size>px, 1fr))` string with slightly
 * different gaps and min-widths; this wrapper makes card sizing/spacing
 * consistent and reads the user's `assetCardSize` preference in one place.
 *
 * `min` floors the column width (templates want a larger floor than the raw
 * card size). `gap` overrides the default spacing for the rare view (e.g.
 * stickers) that needs tighter cells.
 */
export function AssetGrid({
	children,
	min,
	gap = "gap-2.5",
	className,
}: {
	children: ReactNode;
	min?: number;
	gap?: string;
	className?: string;
}) {
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);
	const columnMin = min ? Math.max(assetCardSize, min) : assetCardSize;

	return (
		<div
			className={cn("grid", gap, className)}
			style={{
				gridTemplateColumns: `repeat(auto-fill, minmax(${columnMin}px, 1fr))`,
			}}
		>
			{children}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Windowed grid                                                              */
/* -------------------------------------------------------------------------- */

/**
 * `AssetGrid` renders every card in the filtered catalog. The big catalogs
 * (Overlays 217, Effects 207, Templates 150, Motion 150) therefore mounted
 * hundreds of cards — each Effects card bringing its own `<canvas>` +
 * `IntersectionObserver` — on every tab open and every parent re-render.
 *
 * `VirtualAssetGrid` keeps the *identical* CSS grid, card order, keys and
 * markup, but only mounts the rows that are inside (or just outside) the
 * panel's scroll viewport. The hidden rows are replaced by two spacer grid
 * rows so the scrollbar geometry — and therefore scroll position — is
 * unchanged.
 *
 * Why not `react-window` (already a dependency, used by `ui/font-picker.tsx`):
 * v2's `Grid` is its own scroll container — the root gets `overflow: auto`
 * and the visible range is derived from `element.scrollTop` — and it exposes
 * no external-scroll-container prop. The asset panel already scrolls in
 * `PanelView`'s inner `overflow-y-auto` div, the same div the category bar
 * and search box live in, so adopting `react-window` here would either add a
 * nested scrollbar or require restructuring `base-panel.tsx` (not owned
 * here). The windowing below is the same technique driven by the scroller
 * the panel already has.
 *
 * Geometry is *measured*, never assumed: `columnCount` comes from the real
 * `auto-fill` track width, and `rowHeight` from a real card box. All cards in
 * a given view are structurally identical, so every row is the same height
 * and a single sample is exact. If the geometry cannot be measured — no
 * scroll parent, or nothing with a box yet — the grid stays on its
 * un-windowed probe render, so behaviour can never regress to "cards
 * missing".
 */

/** Extra rows kept mounted above/below the viewport to avoid scroll flashes. */
const OVERSCAN_ROWS = 2;

/**
 * How many items the very first (pre-measurement) render mounts. Large
 * enough to cover any realistic panel viewport at every supported
 * `assetCardSize` (64–220px), so the user never sees a short list, and small
 * enough that the un-measured first paint stays cheap.
 */
const INITIAL_ITEM_COUNT = 24;

/** Upper bound on how many cell boxes are sampled per measurement pass. */
const MAX_MEASURED_CELLS = 60;

/** Stable marker so spacers are skipped when sampling cell boxes. */
const SPACER_ATTRIBUTE = "data-virtual-spacer";

export interface VirtualGridWindow {
	/** First mounted row (0-based). */
	firstRow: number;
	/** Last mounted row (0-based, inclusive). */
	lastRow: number;
	/** Index of the first mounted item (inclusive). */
	firstIndex: number;
	/** Index of the last mounted item (inclusive). */
	lastIndex: number;
	/** Height, in px, of the spacer standing in for the rows above. */
	topSpacer: number;
	/** Height, in px, of the spacer standing in for the rows below. */
	bottomSpacer: number;
}

/**
 * Height of the two stand-in grid rows.
 *
 * A spacer stands in for the hidden rows *and* for the `row-gap` that used
 * to follow the last hidden row, so its own height is
 * `hiddenRows * rowStride - rowGap`: the real grid still puts a `row-gap`
 * between the spacer and the first mounted row. Sizing it this way keeps the
 * scroll height exactly equal to the un-windowed grid's
 * `totalRows * rowHeight + (totalRows - 1) * rowGap`, so the panel scrollbar
 * never jumps when a row mounts or unmounts.
 */
export function computeGridSpacers({
	firstRow,
	lastRow,
	totalRows,
	rowHeight,
	rowGap,
}: {
	firstRow: number;
	lastRow: number;
	totalRows: number;
	rowHeight: number;
	rowGap: number;
}): { topSpacer: number; bottomSpacer: number } {
	// An empty window (empty catalog) has no rows to stand in for.
	if (firstRow < 0 || lastRow < firstRow) {
		return { topSpacer: 0, bottomSpacer: 0 };
	}
	const rowStride = rowHeight + rowGap;
	const lastRowIndex = Math.max(0, totalRows - 1);
	return {
		topSpacer: Math.max(0, firstRow * rowStride - rowGap),
		bottomSpacer: Math.max(
			0,
			(lastRowIndex - lastRow) * rowStride - rowGap,
		),
	};
}

/**
 * Pure geometry for the windowed grid. Exported (and unit-tested) so the
 * window + spacer arithmetic — which has to reproduce the exact scroll
 * height of the un-windowed grid — is verifiable without a DOM.
 *
 * Assumes uniformly sized rows, which holds because every card inside one
 * grid renders the same component with the same CSS.
 */
export function computeVirtualGridWindow({
	itemCount,
	columnCount,
	rowHeight,
	rowGap,
	overscanRows,
	scrollOffset,
	viewportHeight,
}: {
	itemCount: number;
	columnCount: number;
	rowHeight: number;
	rowGap: number;
	overscanRows: number;
	/** Distance in px from the grid's top edge down to the viewport's top edge. */
	scrollOffset: number;
	viewportHeight: number;
}): VirtualGridWindow {
	if (itemCount <= 0) {
		return {
			firstRow: 0,
			lastRow: -1,
			firstIndex: 0,
			lastIndex: -1,
			topSpacer: 0,
			bottomSpacer: 0,
		};
	}

	const columns = Math.max(1, Math.floor(columnCount));
	const rowStride = Math.max(1, rowHeight) + Math.max(0, rowGap);
	const totalRows = Math.max(1, Math.ceil(itemCount / columns));
	const lastRowIndex = totalRows - 1;

	const offset = Math.max(0, scrollOffset);
	const firstVisibleRow = Math.floor(offset / rowStride);
	const lastVisibleRow = Math.floor(
		(offset + Math.max(0, viewportHeight)) / rowStride,
	);

	const firstRow = Math.min(
		Math.max(0, firstVisibleRow - overscanRows),
		lastRowIndex,
	);
	const lastRow = Math.min(
		Math.max(firstRow, lastVisibleRow + overscanRows),
		lastRowIndex,
	);

	return {
		firstRow,
		lastRow,
		firstIndex: firstRow * columns,
		lastIndex: Math.min(itemCount, (lastRow + 1) * columns) - 1,
		...computeGridSpacers({
			firstRow,
			lastRow,
			totalRows,
			rowHeight: Math.max(1, rowHeight),
			rowGap: Math.max(0, rowGap),
		}),
	};
}

interface GridWindowState {
	columnCount: number;
	rowHeight: number;
	rowGap: number;
	firstRow: number;
	lastRow: number;
}

/** Nearest ancestor that actually scrolls vertically, or `null`. */
function findVerticalScroller(node: HTMLElement): HTMLElement | null {
	let current = node.parentElement;
	while (current) {
		const overflowY = window.getComputedStyle(current).overflowY;
		if (
			overflowY === "auto" ||
			overflowY === "scroll" ||
			overflowY === "overlay"
		) {
			return current;
		}
		current = current.parentElement;
	}
	return null;
}

function isSpacer(node: Element): boolean {
	return node.hasAttribute(SPACER_ATTRIBUTE);
}

/**
 * Tallest mounted card box, or `null` when nothing measurable is mounted yet.
 * Taking the max keeps the row height correct even if a card is still being
 * skipped by `content-visibility: auto` and reports a placeholder size.
 */
function measureRowHeight(grid: HTMLElement): number | null {
	let tallest: number | null = null;
	let sampled = 0;
	for (const child of grid.children) {
		if (isSpacer(child) || sampled >= MAX_MEASURED_CELLS) continue;
		sampled += 1;
		const height = child.getBoundingClientRect().height;
		if (height <= 0) continue;
		tallest = tallest === null ? height : Math.max(tallest, height);
	}
	return tallest;
}

export interface VirtualAssetGridProps<T> {
	items: readonly T[];
	/** Stable, unique key per item — the identity drag/selection relies on. */
	getKey: (item: T) => string;
	/** Renders one card. Must return a single keyed element. */
	renderItem: (item: T) => ReactNode;
	/** Floors the column width (see `AssetGrid`). */
	min?: number;
	/** Same Tailwind gap class `AssetGrid` takes. */
	gap?: string;
	className?: string;
}

/**
 * Windowed variant of {@link AssetGrid}. Same layout, same cards, same
 * markup — only the rows outside the scroll viewport are left unmounted.
 */
export function VirtualAssetGrid<T>({
	items,
	getKey,
	renderItem,
	min,
	gap = "gap-2.5",
	className,
}: VirtualAssetGridProps<T>) {
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);
	const columnMin = min ? Math.max(assetCardSize, min) : assetCardSize;

	const gridRef = useRef<HTMLDivElement>(null);
	const scrollerRef = useRef<HTMLElement | null>(null);
	const itemCount = items.length;

	// `null` means "not measured yet" — the first render mounts a fixed probe
	// so the server and the client's first paint agree, and the layout effect
	// below measures before anything is painted.
	const [state, setState] = useState<GridWindowState | null>(null);

	// Re-created whenever the grid's own layout inputs change (the card-size
	// preference or the filtered item count), which re-runs the effect below
	// and re-measures. `gap` is a per-view constant, so it never changes at
	// runtime and is deliberately not a trigger.
	const readState = useCallback((): GridWindowState | null => {
		const grid = gridRef.current;
		const scroller = scrollerRef.current;
		if (!grid || !scroller) return null;

		const gridWidth = grid.getBoundingClientRect().width;
		const rowHeight = measureRowHeight(grid);
		if (rowHeight === null || gridWidth <= 0) return null;

		let measuredCellWidth: number | null = null;
		for (const child of grid.children) {
			if (isSpacer(child)) continue;
			measuredCellWidth = child.getBoundingClientRect().width;
			break;
		}
		// Fall back to the configured column floor when no card has a box yet,
		// so the first window is a sane estimate rather than a hard 1-column
		// guess. Either way the next `sync` replaces it with a real reading.
		const cellWidth =
			measuredCellWidth !== null && measuredCellWidth > 0
				? measuredCellWidth
				: columnMin;

		const gridStyle = window.getComputedStyle(grid);
		const columnGap = Number.parseFloat(gridStyle.columnGap) || 0;
		const rowGap = Number.parseFloat(gridStyle.rowGap) || 0;

		// `auto-fill` resolves to `n` tracks of `cellWidth` separated by
		// `columnGap`, so `gridWidth + gap === n * (cellWidth + gap)`. Reading
		// it off the DOM (instead of recomputing the `minmax()` fit) keeps the
		// column count exactly what CSS chose, including the case where the
		// item count is smaller than the number of columns.
		const columnCount = Math.max(
			1,
			Math.round((gridWidth + columnGap) / (cellWidth + columnGap)),
		);

		const virtualWindow = computeVirtualGridWindow({
			itemCount,
			columnCount,
			rowHeight,
			rowGap,
			overscanRows: OVERSCAN_ROWS,
			// How far the grid's top edge sits below the scroll viewport's top
			// edge: positive once the user has scrolled past the category bar.
			scrollOffset:
				scroller.getBoundingClientRect().top -
				grid.getBoundingClientRect().top,
			viewportHeight: scroller.clientHeight,
		});

		return {
			columnCount,
			rowHeight,
			rowGap,
			firstRow: virtualWindow.firstRow,
			lastRow: virtualWindow.lastRow,
		};
	}, [columnMin, itemCount]);

	useLayoutEffect(() => {
		const grid = gridRef.current;
		if (!grid) return;

		const scroller = findVerticalScroller(grid);
		scrollerRef.current = scroller;
		if (!scroller) {
			// No scroll parent (e.g. the panel is being measured head-less):
			// stay on the un-windowed probe render.
			return;
		}

		let frame = 0;
		const sync = () => {
			frame = 0;
			const next = readState();
			if (next) {
				setState((previous) =>
					previous &&
					previous.firstRow === next.firstRow &&
					previous.lastRow === next.lastRow &&
					previous.columnCount === next.columnCount &&
					previous.rowHeight === next.rowHeight &&
					previous.rowGap === next.rowGap
						? previous
						: next,
				);
			}
		};
		// Scroll fires far more often than the mounted row range changes;
		// coalescing to one frame keeps scrolling off the main render path.
		const scheduleSync = () => {
			if (frame !== 0) return;
			frame = window.requestAnimationFrame(sync);
		};

		sync();
		scroller.addEventListener("scroll", scheduleSync, { passive: true });

		const observer =
			typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
		observer?.observe(scroller);
		observer?.observe(grid);

		return () => {
			if (frame !== 0) window.cancelAnimationFrame(frame);
			scroller.removeEventListener("scroll", scheduleSync);
			observer?.disconnect();
		};
	}, [readState]);

	const totalRows = state
		? Math.max(1, Math.ceil(itemCount / state.columnCount))
		: 1;
	// Clamp against the live item count so a re-filter can never ask for an
	// out-of-range row even before the layout effect re-measures.
	const firstRow = state ? Math.min(state.firstRow, totalRows - 1) : 0;
	const lastRow = state ? Math.min(state.lastRow, totalRows - 1) : 0;

	const firstIndex = state ? firstRow * state.columnCount : 0;
	const lastIndex = state
		? Math.min(itemCount, (lastRow + 1) * state.columnCount) - 1
		: Math.min(itemCount, INITIAL_ITEM_COUNT) - 1;
	const { topSpacer, bottomSpacer } = state
		? computeGridSpacers({
				firstRow,
				lastRow,
				totalRows,
				rowHeight: state.rowHeight,
				rowGap: state.rowGap,
			})
		: { topSpacer: 0, bottomSpacer: 0 };

	return (
		<div
			ref={gridRef}
			className={cn("grid", gap, className)}
			style={{
				gridTemplateColumns: `repeat(auto-fill, minmax(${columnMin}px, 1fr))`,
			}}
		>
			{topSpacer > 0 ? (
				<div
					key="virtual-spacer-top"
					{...{ [SPACER_ATTRIBUTE]: "" }}
					aria-hidden="true"
					style={{ gridColumn: "1 / -1", height: topSpacer }}
				/>
			) : null}
			{items
				.slice(firstIndex, Math.max(firstIndex, lastIndex + 1))
				.map((item) => (
					<Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
				))}
			{bottomSpacer > 0 ? (
				<div
					key="virtual-spacer-bottom"
					{...{ [SPACER_ATTRIBUTE]: "" }}
					aria-hidden="true"
					style={{ gridColumn: "1 / -1", height: bottomSpacer }}
				/>
			) : null}
		</div>
	);
}
