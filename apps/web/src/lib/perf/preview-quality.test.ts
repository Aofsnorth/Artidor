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

// gpu-degraded forces the low tier under auto
assert(
	detectDeviceTier({ gpuDegraded: true }) === "low",
	"degraded → low tier",
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

// clamp floor
assert(
	resolvePreviewScale({ quality: "low", isPlaying: true }) >= 0.2,
	"scale never below 0.2",
);

console.log("preview-quality: all assertions passed");
