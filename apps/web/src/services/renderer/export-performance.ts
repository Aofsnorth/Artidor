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
}: {
	width: number;
	height: number;
}): number {
	const pixels = Math.max(0, width) * Math.max(0, height);
	const fourKPixels = 3840 * 2160;
	const cores = Math.max(
		1,
		(typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 1,
	);

	if (pixels > fourKPixels) return Math.min(12, Math.max(3, cores));
	if (pixels >= fourKPixels) return Math.min(12, Math.max(6, cores));
	return Math.min(16, Math.max(8, cores));
}
