import { MAX_FEATHER } from "@/lib/masks/feather";
import { gpuRenderer } from "./gpu-renderer";

/**
 * Clamp a mask feather radius to the valid WASM range.
 *
 * Feathers arrive from project data (clipboard paste, AI executor, stale
 * saves) where nothing enforces the [0, MAX_FEATHER] UI invariant — the
 * handle path (`computeFeatherUpdate`) clamps, but direct writes bypass it.
 * A negative or NaN radius would be forwarded to the WASM blur; an enormous
 * radius (> element bounds) wastes GPU time on an effectively uniform mask.
 */
export function clampMaskFeather(feather: unknown): number {
	if (typeof feather !== "number" || !Number.isFinite(feather)) return 0;
	return Math.min(MAX_FEATHER, Math.max(0, feather));
}

export function applyMaskFeather({
	maskCanvas,
	width,
	height,
	feather,
}: {
	maskCanvas: CanvasImageSource;
	width: number;
	height: number;
	feather: number;
}): OffscreenCanvas | HTMLCanvasElement {
	return gpuRenderer.applyMaskFeather({
		maskCanvas,
		width,
		height,
		feather: clampMaskFeather(feather),
	}) as OffscreenCanvas | HTMLCanvasElement;
}
