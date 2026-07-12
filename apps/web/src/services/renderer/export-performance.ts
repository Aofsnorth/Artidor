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

/** Bounds queued canvas snapshots by output pixel cost. */
export function getExportRenderQueueDepth({
	width,
	height,
}: {
	width: number;
	height: number;
}): number {
	const pixels = Math.max(0, width) * Math.max(0, height);
	const fourKPixels = 3840 * 2160;
	if (pixels > fourKPixels) return 3;
	if (pixels >= fourKPixels) return 6;
	return 16;
}
