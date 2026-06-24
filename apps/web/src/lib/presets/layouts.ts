/**
 * Multi-clip grid layouts (CapCut-style).
 *
 * A "layout preset" defines N slots on the canvas. Applying a preset to a
 * selection of N visual elements assigns each element a transform that
 * fits it into its slot — pure JS-side, no compositor / renderer changes
 * needed. The element's own `transform` is mutated via the standard
 * `updateElements` command, so undo/redo, groupId linking, parenting,
 * and keyframes all keep working as before.
 *
 * Scope: this file is the data model + pure resolver. UI lives in
 * `apps/web/src/components/editor/panels/assets/views/layouts-view.tsx`
 * and the command lives in
 * `apps/web/src/lib/commands/timeline/layout/apply-layout.ts`.
 *
 * All coordinates are in **canvas pixels** (not viewport pixels) — the
 * layout is a property of the project, not the editor's current zoom.
 */

import type { Transform } from "@/lib/rendering";

/**
 * Multi-clip layout modes.
 *
 * - `grid`: evenly distributed rows × cols. Most common (2×2 split,
 *   3×3 grid, etc).
 * - `pip`: one main slot + N smaller "picture-in-picture" slots
 *   stacked at the bottom. CapCut's default PiP template.
 * - `horizontal`: N slots side-by-side, equal width. For split-screen
 *   timelines or 1×2 / 1×3 strips.
 * - `vertical`: N slots stacked, equal height. For stacked timelines
 *   or 2×1 / 3×1 strips.
 */
export type LayoutMode = "grid" | "pip" | "horizontal" | "vertical";

/**
 * How child elements fit within their slot.
 *
 * - `contain`: preserve aspect ratio, letterbox if needed. Default.
 * - `cover`: preserve aspect ratio, crop if needed. Good for
 *   photo-wall style layouts.
 * - `stretch`: ignore aspect ratio, fill the slot. Good for solid-color
 *   backgrounds.
 */
export type LayoutFit = "contain" | "cover" | "stretch";

/**
 * Canvas-pixel rectangle. Origin is the canvas top-left.
 */
export interface CanvasRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * One named layout preset.
 *
 * `id` is stable and persisted in user-saved presets (future). The
 * `slots` are computed from `mode + rows + cols + params` lazily by
 * `resolveLayoutSlots`, so editing the math doesn't require a migration.
 */
export interface LayoutPreset {
	id: string;
	label: string;
	/** Optional 2-3 line description shown in the UI tooltip. */
	description?: string;
	mode: LayoutMode;
	/**
	 * For `grid` mode: number of rows × cols. For `pip`: `rows` = main
	 * slot height share (1 = full height, 2 = half height for the main
	 * slot), `cols` = PiP columns. Ignored for `horizontal`/`vertical`.
	 */
	rows: number;
	cols: number;
	/** Pixel gap between slots (default 0 for seamless grids). */
	gap?: number;
	/** Pixel padding inside each slot (default 0 = slot fills its cell). */
	padding?: number;
	fit?: LayoutFit;
	/**
	 * PiP-only: relative size of the main slot as a fraction of the
	 * canvas height (0.6 = main takes top 60%, PiPs fill bottom 40%).
	 * Ignored outside `pip` mode.
	 */
	mainHeightShare?: number;
}

export interface ResolveLayoutSlotsParams {
	/** Canvas dimensions in canvas pixels (e.g. 1920×1080). */
	canvas: { width: number; height: number };
	preset: LayoutPreset;
}

/**
 * Resolve a preset into N canvas-pixel rectangles, one per slot.
 *
 * Pure function. Throws on invalid input (rows/cols ≤ 0 or unsupported
 * mode). The order of slots matches the order in which the caller
 * hands elements in, so callers should pre-sort their selection if
 * the visual order matters (top-left to bottom-right for grids).
 */
export function resolveLayoutSlots(
	params: ResolveLayoutSlotsParams,
): CanvasRect[] {
	const { canvas, preset } = params;
	if (canvas.width <= 0 || canvas.height <= 0) {
		throw new Error(
			`resolveLayoutSlots: canvas must be positive (got ${canvas.width}×${canvas.height})`,
		);
	}
	if (preset.rows <= 0 || preset.cols <= 0) {
		throw new Error(
			`resolveLayoutSlots: rows/cols must be positive (got rows=${preset.rows}, cols=${preset.cols})`,
		);
	}
	const gap = preset.gap ?? 0;
	const padding = preset.padding ?? 0;
	const slots: CanvasRect[] = [];

	if (preset.mode === "grid") {
		const cellW = (canvas.width - gap * (preset.cols - 1)) / preset.cols;
		const cellH = (canvas.height - gap * (preset.rows - 1)) / preset.rows;
		for (let r = 0; r < preset.rows; r++) {
			for (let c = 0; c < preset.cols; c++) {
				slots.push({
					x: c * (cellW + gap),
					y: r * (cellH + gap),
					width: cellW,
					height: cellH,
				});
			}
		}
	} else if (preset.mode === "horizontal") {
		const n = preset.rows * preset.cols || 1;
		const slotW = (canvas.width - gap * (n - 1)) / n;
		const slotH = canvas.height;
		for (let i = 0; i < n; i++) {
			slots.push({
				x: i * (slotW + gap),
				y: 0,
				width: slotW,
				height: slotH,
			});
		}
	} else if (preset.mode === "vertical") {
		const n = preset.rows * preset.cols || 1;
		const slotH = (canvas.height - gap * (n - 1)) / n;
		const slotW = canvas.width;
		for (let i = 0; i < n; i++) {
			slots.push({
				x: 0,
				y: i * (slotH + gap),
				width: slotW,
				height: slotH,
			});
		}
	} else if (preset.mode === "pip") {
		const mainShare = preset.mainHeightShare ?? 0.6;
		const mainH = canvas.height * mainShare - gap / 2;
		slots.push({
			x: 0,
			y: 0,
			width: canvas.width,
			height: mainH,
		});
		const pipRows = preset.rows;
		const pipCols = preset.cols;
		const pipAreaY = mainH + gap;
		const pipAreaH = canvas.height - pipAreaY;
		const cellW = (canvas.width - gap * (pipCols - 1)) / pipCols;
		const cellH = (pipAreaH - gap * (pipRows - 1)) / pipRows;
		for (let r = 0; r < pipRows; r++) {
			for (let c = 0; c < pipCols; c++) {
				slots.push({
					x: c * (cellW + gap),
					y: pipAreaY + r * (cellH + gap),
					width: cellW,
					height: cellH,
				});
			}
		}
	} else {
		throw new Error(`resolveLayoutSlots: unknown mode ${preset.mode as string}`);
	}

	// Apply inner padding: shrink each slot by `padding` on all sides.
	if (padding > 0) {
		return slots.map((slot) => ({
			x: slot.x + padding,
			y: slot.y + padding,
			width: Math.max(0, slot.width - padding * 2),
			height: Math.max(0, slot.height - padding * 2),
		}));
	}
	return slots;
}

/**
 * Default element aspect ratio used when an element has no
 * intrinsic dimensions to base the `fit` math on. Matches the
 * Artidor default canvas aspect (16:9).
 */
const DEFAULT_ELEMENT_ASPECT = 16 / 9;

/**
 * Compute the per-element `transform` that fits an element into a
 * canvas-pixel slot. Returns the new transform; the caller's transform
 * is NOT mutated. The element's existing rotation is preserved.
 *
 * Math model (matches `lib/preview/element-bounds.ts`):
 *   - `position.x / position.y` are canvas-pixel offsets from the
 *     canvas centre (so a value of 0 = canvas centre).
 *   - `scaleX / scaleY` are multipliers on the element's source-size
 *     after the contain-scale has been applied. `scaleX = 1` means
 *     "fit the canvas height" for a 16:9 source.
 *
 * `slot` is in canvas pixels. `canvas` is the project canvas. `fit`
 * controls how the element fills the slot.
 */
export function computeTransformForSlot({
	slot,
	canvas,
	elementAspect = DEFAULT_ELEMENT_ASPECT,
	fit = "contain",
	existingRotation = 0,
}: {
	slot: CanvasRect;
	canvas: { width: number; height: number };
	elementAspect?: number;
	fit?: LayoutFit;
	existingRotation?: number;
}): Transform {
	// Slot centre in canvas pixels.
	const cx = slot.x + slot.width / 2;
	const cy = slot.y + slot.height / 2;

	// Compute fit width / height in canvas pixels.
	let w: number;
	let h: number;
	if (fit === "stretch") {
		w = slot.width;
		h = slot.height;
	} else if (fit === "cover") {
		// Fill slot, crop the longer axis.
		const slotAspect = slot.width / slot.height;
		if (slotAspect > elementAspect) {
			h = slot.height;
			w = h * elementAspect;
		} else {
			w = slot.width;
			h = w / elementAspect;
		}
	} else {
		// contain — fit inside slot, letterbox.
		const slotAspect = slot.width / slot.height;
		if (slotAspect > elementAspect) {
			w = slot.width;
			h = w / elementAspect;
		} else {
			h = slot.height;
			w = h * elementAspect;
		}
	}

	// Convert canvas-pixel size to scaleX / scaleY as defined by
	// `getVisualElementBounds`: `scaledWidth = sourceWidth * containScale * scaleX`.
	//
	// The element's source size is unknown here (only its aspect is
	// given), so we model the source as `sourceHeight = canvas.height`
	// (the contain-fits-by-height baseline) and `sourceWidth =
	// sourceHeight * elementAspect`. containScale = 1 when the source
	// already fits the canvas on the height axis, which is true for
	// 16:9 sources on 16:9 canvas, 4:3 on 16:9, etc. — anything
	// where elementAspect ≤ canvas aspect.
	const sourceHeight = canvas.height;
	const sourceWidth = sourceHeight * elementAspect;
	const containScale = Math.min(
		canvas.width / sourceWidth,
		canvas.height / sourceHeight,
	);
	const scaleX = w / (sourceWidth * containScale);
	const scaleY = h / (sourceHeight * containScale);

	return {
		position: {
			// Centre of slot, expressed as offset from canvas centre.
			x: cx - canvas.width / 2,
			y: cy - canvas.height / 2,
		},
		scaleX,
		scaleY,
		rotate: existingRotation,
	};
}

/**
 * Built-in layout presets shipped with the app. Users can compose
 * their own by passing a `LayoutPreset` to `applyLayoutToElements`.
 *
 * The number of slots per preset = `rows * cols` (for `grid`,
 * `horizontal`, `vertical`, `pip`).
 */
export const BUILTIN_LAYOUT_PRESETS: LayoutPreset[] = [
	{
		id: "layout.grid.1x2",
		label: "1 × 2",
		description: "Two equal vertical strips (top / bottom).",
		mode: "vertical",
		rows: 1,
		cols: 2,
	},
	{
		id: "layout.grid.2x1",
		label: "2 × 1",
		description: "Two equal horizontal strips (left / right).",
		mode: "horizontal",
		rows: 2,
		cols: 1,
	},
	{
		id: "layout.grid.2x2",
		label: "2 × 2",
		description: "Four equal quadrants.",
		mode: "grid",
		rows: 2,
		cols: 2,
		gap: 4,
	},
	{
		id: "layout.grid.2x3",
		label: "2 × 3",
		description: "Two rows × three columns.",
		mode: "grid",
		rows: 2,
		cols: 3,
		gap: 4,
	},
	{
		id: "layout.grid.3x3",
		label: "3 × 3",
		description: "Nine equal cells.",
		mode: "grid",
		rows: 3,
		cols: 3,
		gap: 4,
	},
	{
		id: "layout.pip.1x2",
		label: "PiP · 1 × 2",
		description: "Main on top, 2 picture-in-picture strips below.",
		mode: "pip",
		rows: 1,
		cols: 2,
		gap: 4,
		mainHeightShare: 0.66,
	},
	{
		id: "layout.pip.1x3",
		label: "PiP · 1 × 3",
		description: "Main on top, 3 picture-in-picture strips below.",
		mode: "pip",
		rows: 1,
		cols: 3,
		gap: 4,
		mainHeightShare: 0.6,
	},
	{
		id: "layout.pip.2x3",
		label: "PiP · 2 × 3",
		description: "Main on top, 2×3 grid of picture-in-picture below.",
		mode: "pip",
		rows: 2,
		cols: 3,
		gap: 4,
		mainHeightShare: 0.55,
	},
];

export function getBuiltinLayoutPreset({ id }: { id: string }): LayoutPreset | null {
	return BUILTIN_LAYOUT_PRESETS.find((preset) => preset.id === id) ?? null;
}