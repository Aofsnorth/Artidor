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
