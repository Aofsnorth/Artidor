// Run: `bun test apps/web/src/lib/perf/preview-quality.test.ts`
// No framework — plain asserts, exits non-zero on failure.
import {
	detectDeviceTier,
	resolveAdaptiveScale,
	resolveDecodeMaxDim,
	resolvePreviewRenderScales,
	resolvePreviewScale,
} from "./preview-quality";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

// high never degrades, even during playback
assert(
	resolvePreviewScale({ quality: "high", isPlaying: true }) === 1,
	"high stays 1x on playback",
);

// low idle = static tier scale; playback is more aggressive
assert(
	resolvePreviewScale({ quality: "low", isPlaying: false }) === 0.4,
	"low idle = 0.4",
);
assert(
	resolvePreviewScale({ quality: "low", isPlaying: true }) < 0.4,
	"low playback < idle",
);

// gpu-degraded forces the ultra tier under auto (potato tier for software
// rendering — 0.25x scale, ~16x less GPU work than full-res)
assert(
	detectDeviceTier({ gpuDegraded: true }) === "ultra",
	"degraded → ultra tier",
);

// decode cap: none at full quality, even longest-edge otherwise
assert(
	resolveDecodeMaxDim({ renderWidth: 1920, renderHeight: 1080, scale: 1 }) ===
		undefined,
	"no decode cap at 1x",
);
assert(
	resolveDecodeMaxDim({ renderWidth: 1920, renderHeight: 1080, scale: 0.5 }) ===
		960,
	"cap = longest * scale, rounded even",
);

// clamp floor (0.15 for ultra tier)
assert(
	resolvePreviewScale({ quality: "low", isPlaying: true }) >= 0.15,
	"scale never below 0.15",
);

// --- resolvePreviewRenderScales: render scale follows playback, decode scale stays idle ---
{
	const scales = resolvePreviewRenderScales({
		quality: "low",
		isPlaying: true,
	});
	assert(
		scales.renderScale < scales.decodeScale,
		"playback render scale is lower",
	);
	assert(scales.decodeScale === 0.4, "decode scale stays at idle low tier");
}
{
	const low = resolvePreviewRenderScales({ quality: "low", isPlaying: true });
	const medium = resolvePreviewRenderScales({
		quality: "medium",
		isPlaying: true,
	});
	assert(
		low.decodeScale !== medium.decodeScale,
		"manual quality changes update decode scale",
	);
}

// --- resolveAdaptiveScale: manual tiers delegate unchanged ---
assert(
	resolveAdaptiveScale({
		quality: "high",
		isPlaying: true,
		avgRenderMs: 999,
		frameBudgetMs: 16,
	}) === 1,
	"high tier never adapts even when very slow",
);
assert(
	resolveAdaptiveScale({
		quality: "medium",
		isPlaying: false,
		avgRenderMs: 999,
		frameBudgetMs: 16,
	}) === resolvePreviewScale({ quality: "medium", isPlaying: false }),
	"medium tier delegates to resolvePreviewScale",
);

// --- resolveAdaptiveScale: auto without perf data falls back ---
{
	// Force a deterministic tier by stubbing navigator. detectDeviceTier
	// reads navigator.hardwareConcurrency / deviceMemory. In the test
	// runner these are absent → cores defaults to 8 → "medium" tier.
	// We can't easily stub navigator here, so just assert the fallback
	// equals the static resolve for the same inputs.
	const fallback = resolveAdaptiveScale({
		quality: "auto",
		isPlaying: false,
	});
	const staticScale = resolvePreviewScale({
		quality: "auto",
		isPlaying: false,
	});
	assert(
		Math.abs(fallback - staticScale) < 1e-9,
		"auto without perf data falls back to static scale",
	);
}

// --- resolveAdaptiveScale: auto drops a tier when struggling ---
{
	// Detect the base tier the test runner resolves to, then verify a
	// very slow avg render drops one tier below it.
	const baseTier = detectDeviceTier();
	const baseScale = resolvePreviewScale({
		quality: "auto",
		isPlaying: false,
	});
	const slowScale = resolveAdaptiveScale({
		quality: "auto",
		isPlaying: false,
		avgRenderMs: 100, // 6x a 16ms budget → well into struggle
		frameBudgetMs: 16,
	});
	// If base tier is already at the floor (ultra), it can't drop further →
	// stays equal. Otherwise the adaptive scale must be strictly lower.
	if (baseTier === "ultra") {
		assert(
			Math.abs(slowScale - baseScale) < 1e-9,
			"auto at ultra tier can't drop further → stays at ultra",
		);
	} else {
		assert(
			slowScale < baseScale,
			`auto drops scale when struggling (base ${baseTier}: ${baseScale} → ${slowScale})`,
		);
	}
}

// --- resolveAdaptiveScale: auto recovers when fast ---
{
	// Drop to low first (very slow), then feed a very fast avg → should
	// recover back toward the device base tier.
	const baseTier = detectDeviceTier();
	const baseScale = resolvePreviewScale({
		quality: "auto",
		isPlaying: false,
	});
	const fastScale = resolveAdaptiveScale({
		quality: "auto",
		isPlaying: false,
		avgRenderMs: 1, // far below recover threshold
		frameBudgetMs: 16,
	});
	// Fast path should recover to at least the base tier scale (never
	// exceeds it — adaptive only recovers *up to* the device base).
	assert(
		Math.abs(fastScale - baseScale) < 1e-9,
		`auto recovers to base tier ${baseTier} when fast (${fastScale} ≈ ${baseScale})`,
	);
}

// --- resolveAdaptiveScale: hysteresis band (between 0.7× and 1.5×) ---
{
	// 16ms budget: struggle at >24ms, recover at <11.2ms.
	// 16ms is in the hysteresis band → should stay at base tier.
	const baseScale = resolvePreviewScale({
		quality: "auto",
		isPlaying: false,
	});
	const midScale = resolveAdaptiveScale({
		quality: "auto",
		isPlaying: false,
		avgRenderMs: 16, // exactly at budget → neither struggle nor recover
		frameBudgetMs: 16,
	});
	assert(
		Math.abs(midScale - baseScale) < 1e-9,
		"avg render in hysteresis band → stays at base tier",
	);
}

// --- resolveAdaptiveScale: clamps to [0.15, 1] ---
{
	const scale = resolveAdaptiveScale({
		quality: "auto",
		isPlaying: true,
		avgRenderMs: 1000,
		frameBudgetMs: 16,
	});
	assert(scale >= 0.15, "adaptive scale never below 0.15");
	assert(scale <= 1, "adaptive scale never above 1");
}

console.log("preview-quality: all assertions passed");
