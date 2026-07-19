// Run: `bun test apps/web/src/lib/perf/preview-quality.test.ts`
// No framework — plain asserts, exits non-zero on failure.
import {
	detectDeviceTier,
	resolveDecodeMaxDim,
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

console.log("preview-quality: all assertions passed");
