"use client";

/**
 * Singleton handle to the live preview canvas. The preview
 * component registers its canvas DOM ref here on mount; the
 * scopes in the Advanced card read from it via
 * `getPreviewCanvas()` + `samplePreviewCanvas()`.
 *
 * The handle is intentionally a module-level mutable rather than
 * a React context: scopes fire from inside a `requestAnimationFrame`
 * loop and reading through a context would force every frame to
 * also trigger a React subscription. The handle is a plain DOM
 * ref + an opaque "is-ready" boolean, so consumers fall back to
 * the empty scope silhouette if the preview isn't mounted yet.
 */

let currentCanvas: HTMLCanvasElement | null = null;
let currentSize: { width: number; height: number } | null = null;

export function registerPreviewCanvas({
	canvas,
	width,
	height,
}: {
	canvas: HTMLCanvasElement | null;
	width: number;
	height: number;
}): void {
	currentCanvas = canvas;
	currentSize = canvas ? { width, height } : null;
}

export function getPreviewCanvas(): {
	canvas: HTMLCanvasElement;
	width: number;
	height: number;
} | null {
	if (!currentCanvas || !currentSize) return null;
	return { canvas: currentCanvas, ...currentSize };
}

/**
 * Read the current preview canvas and return a sampled pixel
 * buffer. Returns `null` if the canvas isn't mounted or is
 * tainted (e.g. cross-origin image — the project never loads
 * those, so this should always succeed in practice).
 *
 * `columns` is the resolution of the sampled column buffer
 * (used for waveform). The returned data uses 8-bit channels
 * laid out RGBA per pixel. Cheap enough to call from a
 * `requestAnimationFrame` loop at modest sizes.
 */
export function samplePreviewCanvas({
	columns = 96,
}: {
	columns?: number;
} = {}): {
	pixels: Uint8ClampedArray;
	columns: number;
	rows: number;
	width: number;
	height: number;
} | null {
	const handle = getPreviewCanvas();
	if (!handle) return null;
	const { canvas, width, height } = handle;
	if (width === 0 || height === 0) return null;

	try {
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return null;
		// Downsample to a column buffer (one column = N rows
		// averaged) so the waveform can render at the inspector's
		// width without us paying for a full HD getImageData every
		// frame.
		const rows = 64;
		const tmp = document.createElement("canvas");
		tmp.width = columns;
		tmp.height = rows;
		const tctx = tmp.getContext("2d", { willReadFrequently: true });
		if (!tctx) return null;
		tctx.drawImage(canvas, 0, 0, columns, rows);
		const data = tctx.getImageData(0, 0, columns, rows);
		return { pixels: data.data, columns, rows, width, height };
	} catch {
		return null;
	}
}
