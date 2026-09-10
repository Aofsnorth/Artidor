/** Export-pipeline scheduling policies shared by workers and tests. */

/**
 * Wait until a worker finishes GPU setup, with a fallback for old/broken
 * workers that never emit the readiness signal.
 */
export async function waitForWorkerGpuReady(
	ready: Promise<void>,
	fallbackDelayMs: number,
): Promise<void> {
	await Promise.race([
		ready,
		new Promise<void>((resolve) => setTimeout(resolve, fallbackDelayMs)),
	]);
}

/**
 * Bounds queued canvas snapshots by output pixel cost and available CPU cores.
 *
 * Higher resolution frames consume more GPU memory, so the queue is tightened
 * for 4K and above. The lower bound still scales with `hardwareConcurrency` so
 * machines with more cores can keep more frames in flight without stalling.
 */
export function getExportRenderQueueDepth({
	width,
	height,
	cores = detectHardwareConcurrency(),
}: {
	width: number;
	height: number;
	/** Available CPU cores. Defaults to `navigator.hardwareConcurrency`. */
	cores?: number;
}): number {
	const pixels = Math.max(0, width) * Math.max(0, height);
	const fourKPixels = 3840 * 2160;
	const safeCores = Math.max(1, cores || 1);

	if (pixels > fourKPixels) return Math.min(12, Math.max(3, safeCores));
	if (pixels >= fourKPixels) return Math.min(12, Math.max(6, safeCores));
	return Math.min(16, Math.max(8, safeCores));
}

/** Reads the host CPU core count, falling back to 1 when unavailable. */
function detectHardwareConcurrency(): number {
	return (
		(typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 1
	);
}

/**
 * Advisory-only adaptive segment-size model for the parallel exporter.
 *
 * Pure function of (timeline length, resolution, core count) — no worker
 * changes, no wiring. It mirrors the `shouldUseParallelExport` gating in
 * `segment-plan.ts` (120 full-HD frame-equivalents per segment) and layers a
 * soft per-segment work target on top so worker count grows sub-linearly
 * past 4 workers (startup/mux overhead dominates beyond that).
 *
 * Not wired into `parallel-export.ts` by this pass (worker files are
 * read-only for this scope). Callers should treat the result as a starting
 * recommendation and still apply the `segment-plan.ts` invariants (contiguous
 * coverage, `MIN_FRAMES_PER_SEGMENT` floor).
 *
 * Returns a segment count in `[1, 16]`. Returns 1 when parallelism is not
 * worthwhile (too little pixel work to amortize worker startup).
 */
export function recommendSegmentCount({
	totalFrames,
	width,
	height,
	cores = detectHardwareConcurrency(),
}: {
	totalFrames: number;
	width: number;
	height: number;
	cores?: number;
}): number {
	const safeFrames = Number.isFinite(totalFrames) ? Math.floor(totalFrames) : 0;
	if (safeFrames <= 0) return 1;

	const pixelsPerFrame = Math.max(0, width) * Math.max(0, height);
	const fullHdPixels = 1920 * 1080;
	const frameEquivalents =
		fullHdPixels > 0 ? (safeFrames * pixelsPerFrame) / fullHdPixels : 0;

	// Same bar as `shouldUseParallelExport`: fewer than 240 equivalents cannot
	// cover even 2 workers at 120 equivalents each.
	if (frameEquivalents < 240) return 1;

	const safeCores = Number.isFinite(cores) ? Math.max(1, Math.floor(cores)) : 1;

	// One segment per ~240 equivalents keeps segment startup amortized;
	// dampen past 4 workers where mux/concat overhead starts to dominate.
	const byWorkload = Math.floor(frameEquivalents / 240) + 1;
	const dampened =
		byWorkload <= 4 ? byWorkload : 4 + Math.floor((byWorkload - 4) / 2);

	return Math.min(16, Math.max(1, Math.min(safeCores, dampened)));
}
