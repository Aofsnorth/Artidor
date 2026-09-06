import {
	applyEffectPasses,
	applyMaskFeather as applyMaskFeatherWasm,
	initializeGpu,
} from "artidor-wasm";
import type { EffectPass, EffectUniformValue } from "@/lib/effects/types";

const UNSUPPORTED_GPU_SURFACE_MESSAGE =
	"The output surface does not support the required texture format";

let gpuAvailable = false;
let initPromise: Promise<void> | null = null;

/**
 * Initializes the shared WASM GPU runtime once per page load.
 *
 * All callers receive the same promise so preview, thumbnail, and snapshot
 * rendering cannot race ahead of `initializeGpu()` or initialize it twice.
 * Initialization failures resolve with `isGpuAvailable()` set to false, which
 * lets callers use their existing degraded or fallback behavior. The cached
 * promise is cleared on failure so a later call retries — a transient
 * startup failure does not disable GPU rendering for the page's lifetime.
 */
export function initializeGpuRenderer(): Promise<void> {
	if (!initPromise) {
		initPromise = initializeGpu()
			.then(() => {
				gpuAvailable = true;
			})
			.catch((error: unknown) => {
				gpuAvailable = false;
				// Allow a later retry: a transient startup failure (driver reset,
				// ANGLE contention) should not disable GPU rendering for the
				// lifetime of the page.
				initPromise = null;
				const message = error instanceof Error ? error.message : String(error);
				console.warn(`GPU renderer unavailable: ${message}`);
			});
	}
	return initPromise;
}

export function isGpuAvailable(): boolean {
	return gpuAvailable;
}

/**
 * Identifies the browser surface-format failure seen on some Linux Chromium
 * and ANGLE stacks. GPU device initialization succeeds in this case, but the
 * compositor cannot present to its OffscreenCanvas. Callers should stop the
 * render loop and use a canvas/background fallback instead of retrying.
 */
export function isUnsupportedGpuSurfaceError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes(UNSUPPORTED_GPU_SURFACE_MESSAGE);
}

export const gpuRenderer = {
	applyEffect({
		source,
		width,
		height,
		passes,
	}: {
		source: CanvasImageSource;
		width: number;
		height: number;
		passes: EffectPass[];
	}): CanvasImageSource {
		if (passes.length === 0 || !gpuAvailable) {
			return source;
		}

		try {
			return applyEffectPasses({
				source,
				width,
				height,
				passes: serializeEffectPasses(passes),
			});
		} catch (error) {
			// A single failing effect pass (bad uniform, shader compile) is not a
			// GPU outage — do not flip the global `gpuAvailable` flag, otherwise
			// preview rendering dies circuit-breaker style until page reload.
			console.warn(
				"GPU effect renderer failed; falling back to source preview.",
				error,
			);
			return source;
		}
	},

	applyMaskFeather({
		maskCanvas,
		width,
		height,
		feather,
	}: {
		maskCanvas: CanvasImageSource;
		width: number;
		height: number;
		feather: number;
	}): CanvasImageSource {
		if (!gpuAvailable) {
			return maskCanvas;
		}

		return applyMaskFeatherWasm({
			mask: maskCanvas,
			width,
			height,
			feather,
		});
	},
};

function serializeEffectPasses(passes: EffectPass[]) {
	return passes.map((pass) => ({
		shader: pass.shader,
		uniforms: Object.entries(pass.uniforms).map(([name, value]) => ({
			name,
			value: normalizeUniformValue(value),
		})),
	}));
}

function normalizeUniformValue(value: EffectUniformValue): number[] {
	return typeof value === "number" ? [value] : value;
}
