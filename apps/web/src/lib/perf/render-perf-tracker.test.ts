// Run: `bun test apps/web/src/lib/perf/render-perf-tracker.test.ts`
// No framework — plain asserts, exits non-zero on failure.
import { RenderPerfTracker } from "./render-perf-tracker";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

// --- ring buffer caps at capacity ---
{
	const tracker = new RenderPerfTracker(5);
	for (let i = 1; i <= 10; i++) tracker.recordRender(i);
	assert(tracker.size === 5, "buffer caps at capacity");
	// After 10 pushes into a size-5 buffer, the oldest 5 are overwritten.
	// The buffer should hold samples 6..10 → average = 8.
	assert(
		Math.abs(tracker.getAverageRenderMs() - 8) < 1e-9,
		"average reflects only the last `capacity` samples",
	);
}

// --- empty tracker ---
{
	const tracker = new RenderPerfTracker(10);
	assert(tracker.size === 0, "empty tracker size 0");
	assert(tracker.getAverageRenderMs() === 0, "empty average is 0");
	assert(!tracker.isStruggling(16), "empty tracker not struggling");
	assert(!tracker.isRecovered(16), "empty tracker not recovered");
}

// --- isStruggling requires minSamples ---
{
	const tracker = new RenderPerfTracker(30);
	// 7 samples all at 100ms (way over 16ms budget) but below default
	// minSamples=8 → not struggling yet.
	for (let i = 0; i < 7; i++) tracker.recordRender(100);
	assert(!tracker.isStruggling(16), "below minSamples → not struggling");
	// 8th sample → now struggling.
	tracker.recordRender(100);
	assert(tracker.isStruggling(16), "at minSamples + over budget → struggling");
}

// --- isRecovered hysteresis ---
{
	const tracker = new RenderPerfTracker(30);
	// 10 samples at 10ms, budget 16ms, recoverFactor 0.7 → threshold 11.2ms.
	// 10 < 11.2 → recovered.
	for (let i = 0; i < 10; i++) tracker.recordRender(10);
	assert(tracker.isRecovered(16), "10ms avg < 11.2ms threshold → recovered");
	// 10 samples at 12ms → 12 > 11.2 → NOT recovered (above recovery threshold
	// but below struggle threshold 16 — this is the hysteresis band).
	const t2 = new RenderPerfTracker(30);
	for (let i = 0; i < 10; i++) t2.recordRender(12);
	assert(!t2.isRecovered(16), "12ms is in hysteresis band → not recovered");
	assert(!t2.isStruggling(16), "12ms is in hysteresis band → not struggling");
}

// --- negative / non-finite samples ignored ---
{
	const tracker = new RenderPerfTracker(10);
	tracker.recordRender(-5);
	tracker.recordRender(NaN);
	tracker.recordRender(Infinity);
	assert(tracker.size === 0, "invalid samples ignored");
	tracker.recordRender(20);
	assert(tracker.size === 1, "valid sample recorded");
	assert(tracker.getAverageRenderMs() === 20, "average of one valid sample");
}

// --- reset ---
{
	const tracker = new RenderPerfTracker(10);
	for (let i = 0; i < 5; i++) tracker.recordRender(50);
	tracker.reset();
	assert(tracker.size === 0, "reset clears buffer");
	assert(tracker.getAverageRenderMs() === 0, "reset average is 0");
}

// --- capacity must be positive ---
{
	let threw = false;
	try {
		new RenderPerfTracker(0);
	} catch {
		threw = true;
	}
	assert(threw, "capacity 0 throws");
}

console.log("render-perf-tracker: all assertions passed");
