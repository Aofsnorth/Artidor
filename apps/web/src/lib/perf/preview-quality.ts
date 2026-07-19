// Preview performance scaling. The whole render pipeline derives every
// transform from `renderer.width/height` (see frame-descriptor.ts), so
// rendering the preview at a fraction of project resolution scales the
// compositor, every texture raster, AND the video decode down together —
// the single biggest win for low-end ("potato") machines. Export is
// unaffected: it builds its own full-res CanvasRenderer.

export type PreviewQuality = "auto" | "high" | "medium" | "low" | "ultra";

export const PREVIEW_QUALITIES: PreviewQuality[] = [
	"auto",
	"high",
	"medium",
	"low",
	"ultra",
];

export const PREVIEW_QUALITY_LABELS: Record<PreviewQuality, string> = {
	auto: "Auto",
	high: "High",
	medium: "Medium",
	low: "Low",
	ultra: "Ultra Low",
};

// Static scale per explicit tier. `auto` resolves to one of these via
// device detection. 1 = full project resolution.
// `ultra` (0.25x) is for potato PCs — 480p from 1080p, 720p from 4K.
// The compositor + decode + texture upload all scale together, so this
// is a ~16x reduction in GPU work vs full-res.
const TIER_SCALE: Record<Exclude<PreviewQuality, "auto">, number> = {
	high: 1,
	medium: 0.66,
	low: 0.4,
	ultra: 0.25,
};

// Extra multiplier applied only while the timeline is playing — frozen
// frames stay crisp, scrubbing/playback trades sharpness for smoothness.
// `high` never degrades on playback (user explicitly asked for sharp).
const PLAYBACK_SCALE: Record<Exclude<PreviewQuality, "auto">, number> = {
	high: 1,
	medium: 0.75,
	low: 0.6,
	ultra: 0.6,
};

/**
 * Detect a sane default tier from device hints. Cheap, called once.
 * `gpuDegraded` = the WASM/WebGPU compositor failed to init (software path).
 */
export function detectDeviceTier({
	gpuDegraded = false,
}: {
	gpuDegraded?: boolean;
} = {}): Exclude<PreviewQuality, "auto"> {
	if (gpuDegraded) return "ultra";
	if (typeof navigator === "undefined") return "high";

	const cores = navigator.hardwareConcurrency ?? 8;
	// deviceMemory is Chromium-only and coarse (GB); absent on FF/Safari.
	const memory = (navigator as Navigator & { deviceMemory?: number })
		.deviceMemory;

	// 2 cores or ≤2GB RAM → ultra (potato tier). This covers Chromebooks,
	// old laptops, and low-end machines that would otherwise stutter at
	// the "low" tier.
	if (cores <= 2 || (memory !== undefined && memory <= 2)) return "ultra";
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
	return Math.min(1, Math.max(0.15, scale));
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
