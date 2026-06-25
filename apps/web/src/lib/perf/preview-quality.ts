// Preview performance scaling. The whole render pipeline derives every
// transform from `renderer.width/height` (see frame-descriptor.ts), so
// rendering the preview at a fraction of project resolution scales the
// compositor, every texture raster, AND the video decode down together —
// the single biggest win for low-end ("potato") machines. Export is
// unaffected: it builds its own full-res CanvasRenderer.

export type PreviewQuality = "auto" | "high" | "medium" | "low";

export const PREVIEW_QUALITIES: PreviewQuality[] = [
	"auto",
	"high",
	"medium",
	"low",
];

export const PREVIEW_QUALITY_LABELS: Record<PreviewQuality, string> = {
	auto: "Auto",
	high: "High",
	medium: "Medium",
	low: "Low",
};

// Static scale per explicit tier. `auto` resolves to one of these via
// device detection. 1 = full project resolution.
const TIER_SCALE: Record<Exclude<PreviewQuality, "auto">, number> = {
	high: 1,
	medium: 0.66,
	low: 0.4,
};

// Extra multiplier applied only while the timeline is playing — frozen
// frames stay crisp, scrubbing/playback trades sharpness for smoothness.
// `high` never degrades on playback (user explicitly asked for sharp).
const PLAYBACK_SCALE: Record<Exclude<PreviewQuality, "auto">, number> = {
	high: 1,
	medium: 0.75,
	low: 0.6,
};

/**
 * Detect a sane default tier from device hints. Cheap, called once.
 * `gpuDegraded` = the WASM/WebGPU compositor failed to init (software path).
 */
export function detectDeviceTier({
	gpuDegraded = false,
}: { gpuDegraded?: boolean } = {}): Exclude<PreviewQuality, "auto"> {
	if (gpuDegraded) return "low";
	if (typeof navigator === "undefined") return "high";

	const cores = navigator.hardwareConcurrency ?? 8;
	// deviceMemory is Chromium-only and coarse (GB); absent on FF/Safari.
	const memory = (navigator as Navigator & { deviceMemory?: number })
		.deviceMemory;

	if (cores <= 4 || (memory !== undefined && memory <= 4)) return "low";
	if (cores <= 8 || (memory !== undefined && memory <= 8)) return "medium";
	return "high";
}

/**
 * Resolve the render scale for the current quality setting and playback
 * state. Clamped to [0.2, 1].
 */
export function resolvePreviewScale({
	quality,
	isPlaying,
	gpuDegraded = false,
}: {
	quality: PreviewQuality;
	isPlaying: boolean;
	gpuDegraded?: boolean;
}): number {
	const tier = quality === "auto" ? detectDeviceTier({ gpuDegraded }) : quality;
	const base = TIER_SCALE[tier];
	const scale = isPlaying ? base * PLAYBACK_SCALE[tier] : base;
	return Math.min(1, Math.max(0.2, scale));
}

/**
 * Longest-edge cap for video decode at a given render size. Decoding a 4K
 * source to fill a 720p preview canvas is pure waste, so cap the decode to
 * the scaled render dimension (rounded up to a multiple of 2 for codecs).
 * Returns undefined for full-quality (no cap) so export stays untouched.
 */
export function resolveDecodeMaxDim({
	renderWidth,
	renderHeight,
	scale,
}: {
	renderWidth: number;
	renderHeight: number;
	scale: number;
}): number | undefined {
	if (scale >= 1) return undefined;
	const longest = Math.max(renderWidth, renderHeight) * scale;
	return Math.max(2, Math.ceil(longest / 2) * 2);
}

// --- Adaptive quality (auto mode only) -------------------------------------

/**
 * Ordered tiers, lowest first. Used by the adaptive logic to step up/down
 * one tier at a time instead of jumping straight to the floor/ceiling.
 */
const ADAPTIVE_TIER_ORDER: Exclude<PreviewQuality, "auto">[] = [
	"low",
	"medium",
	"high",
];

/**
 * Hysteresis factors for the adaptive scale. The system must be
 * `STRUGGLE_FACTOR × frameBudget` slow before dropping a tier, and
 * `RECOVER_FACTOR × frameBudget` fast before recovering. The wide band
 * between the two prevents the tier from oscillating near the boundary.
 */
const STRUGGLE_FACTOR = 1.5;
const RECOVER_FACTOR = 0.7;

/**
 * Resolve the render scale for the current quality setting, playback
 * state, and *measured* render performance. When `quality !== "auto"`,
 * this delegates to {@link resolvePreviewScale} — manual tiers are never
 * overridden. When `quality === "auto"`, the base tier (from device
 * hints) is adjusted up/down one step based on the average render time
 * vs. the frame budget, with hysteresis to prevent oscillation.
 *
 * `avgRenderMs` and `frameBudgetMs` are optional; when omitted (or when
 * the tracker hasn't collected enough samples) the function falls back to
 * the static {@link resolvePreviewScale} so callers can use this
 * uniformly without branching on "do we have perf data yet".
 */
export function resolveAdaptiveScale({
	quality,
	isPlaying,
	gpuDegraded,
	avgRenderMs,
	frameBudgetMs,
}: {
	quality: PreviewQuality;
	isPlaying: boolean;
	gpuDegraded?: boolean;
	/** Recent average render duration in ms (from RenderPerfTracker). */
	avgRenderMs?: number;
	/** Per-frame budget in ms (1000 / fps). Required for adaptation. */
	frameBudgetMs?: number;
}): number {
	// Manual tiers — never adapt.
	if (quality !== "auto") {
		return resolvePreviewScale({ quality, isPlaying, gpuDegraded });
	}

	// Auto without perf data — fall back to the static device-tier scale.
	if (avgRenderMs === undefined || frameBudgetMs === undefined) {
		return resolvePreviewScale({ quality, isPlaying, gpuDegraded });
	}

	const baseTier = detectDeviceTier({ gpuDegraded });
	const baseIdx = ADAPTIVE_TIER_ORDER.indexOf(baseTier);

	// Drop a tier when consistently slower than the struggle threshold.
	let tierIdx = baseIdx;
	if (avgRenderMs > frameBudgetMs * STRUGGLE_FACTOR && tierIdx > 0) {
		tierIdx = tierIdx - 1;
	}
	// Recover a tier when comfortably faster than the recover threshold.
	// Only recover up to the device-detected base — never exceed what the
	// hardware hints suggest (avoids oversaturating a weak machine after
	// a brief idle period).
	else if (
		avgRenderMs < frameBudgetMs * RECOVER_FACTOR &&
		tierIdx < baseIdx
	) {
		tierIdx = tierIdx + 1;
	}

	const tier = ADAPTIVE_TIER_ORDER[tierIdx] ?? baseTier;
	const base = TIER_SCALE[tier];
	const scale = isPlaying ? base * PLAYBACK_SCALE[tier] : base;
	return Math.min(1, Math.max(0.2, scale));
}
