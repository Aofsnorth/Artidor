/**
 * Pure segment-planning math for the parallel exporter.
 *
 * Kept dependency-free (no WASM, no mediabunny) so the splitting invariants —
 * which, if wrong, would produce gaps/overlaps or desync in the stitched
 * output — can be unit-tested in isolation.
 */

/**
 * Hard cap on parallel segments. Each segment spins up its own WebGPU device
 * and hardware decoder/encoder. GPU init is staggered across workers (see
 * parallel-export.ts) to avoid adapter-request deadlocks. With modern GPUs
 * supporting multiple contexts, 16 workers provides near-100% utilization on
 * 16+ core machines (turbo mode). Memory is the real limiter (each worker
 * ~50-200MB).
 */
export const MAX_SEGMENTS = 16;

/**
 * Minimum frames a segment must contain to be worth a dedicated worker. Worker
 * spin-up (module load + WASM GPU init) costs a fixed ~200-500 ms, so tiny
 * segments would spend more time starting up than encoding. ~2 s at 30 fps.
 */
export const MIN_FRAMES_PER_SEGMENT = 60;

export type SegmentPlan = {
	index: number;
	/** Inclusive start frame (global timeline index). */
	startFrame: number;
	/** Exclusive end frame (global timeline index). */
	endFrame: number;
	/** Number of frames in this segment. */
	frames: number;
	/** Global start time of the segment in seconds (the concat offset). */
	startSeconds: number;
};

/**
 * Decide how many segments to split `totalFrames` into, given the machine's
 * logical core count. Returns 1 when parallelism isn't worthwhile (short
 * timeline or single-core), which signals callers to use the plain
 * single-worker path.
 */
export function planSegmentCount(totalFrames: number, cores: number): number {
	const safeCores = Number.isFinite(cores) && cores > 0 ? Math.floor(cores) : 4;
	const byCores = Math.min(safeCores, MAX_SEGMENTS);
	const byLength = Math.floor(totalFrames / MIN_FRAMES_PER_SEGMENT);
	return Math.max(1, Math.min(byCores, byLength));
}

/**
 * Split `totalFrames` into `count` contiguous, near-equal frame ranges.
 *
 * Invariants (verified by tests):
 * - Ranges are contiguous and cover exactly `[0, totalFrames)` with no gap or
 *   overlap (`plans[i].endFrame === plans[i + 1].startFrame`).
 * - Frame counts differ by at most one (the remainder is spread across the
 *   leading segments).
 * - `startSeconds` is the exact global start time, so offsetting a segment's
 *   local timestamps by it reproduces the serial export's uniform frame
 *   spacing (the tick→seconds map is linear).
 */
export function buildSegmentPlans({
	totalFrames,
	count,
	ticksPerFrame,
	ticksPerSecond,
}: {
	totalFrames: number;
	count: number;
	ticksPerFrame: number;
	ticksPerSecond: number;
}): SegmentPlan[] {
	const base = Math.floor(totalFrames / count);
	const remainder = totalFrames - base * count;
	const plans: SegmentPlan[] = [];
	let cursor = 0;
	for (let i = 0; i < count; i++) {
		// Distribute the remainder across the first `remainder` segments so the
		// frame counts differ by at most one.
		const frames = base + (i < remainder ? 1 : 0);
		const startFrame = cursor;
		const endFrame = cursor + frames;
		plans.push({
			index: i,
			startFrame,
			endFrame,
			frames,
			startSeconds: (startFrame * ticksPerFrame) / ticksPerSecond,
		});
		cursor = endFrame;
	}
	return plans;
}
