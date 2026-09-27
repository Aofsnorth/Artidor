/** Export-pipeline scheduling policies shared by workers and tests. */

import type { ExportQuality } from "@/lib/export";

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
 * In-flight `VideoFrame` budget for ONE export worker, in bytes.
 *
 * Every frame queued in the render→encode pipeline pins a full decoded surface
 * on the GPU until its encode resolves, so the safe queue depth is a *byte*
 * budget, not a frame count. 16 frames is ~133 MB at 1080p (a real VRAM cliff
 * once 4 workers are running) but only ~15 MB at 360p. Deriving the depth from
 * `budget / (w*h*4)` keeps retained VRAM roughly constant across resolutions
 * instead of scaling with the machine's core count.
 *
 * 128 MiB keeps 1080p at 15 frames (unchanged throughput versus the old fixed
 * cap of 16) while cutting 4K from 6-12 frames to 3 and 8K from 3-12 to 2.
 */
export const EXPORT_FRAME_QUEUE_BUDGET_BYTES = 128 * 1024 * 1024;

/**
 * Hard bounds on the queue depth.
 *
 * Even at 8K a single frame is ~133 MB, so a depth of 1 would serialise render
 * against encode and halve throughput; 2 is the floor that still pipelines.
 */
const MIN_FRAME_QUEUE_DEPTH = 2;
const MAX_FRAME_QUEUE_DEPTH = 16;

/**
 * Bounds queued canvas snapshots by output pixel cost, capped by CPU cores.
 *
 * Pixel cost is the primary driver (see
 * {@link EXPORT_FRAME_QUEUE_BUDGET_BYTES}); `cores` only acts as a ceiling so a
 * machine that can schedule two renders in parallel does not hold a deep queue
 * it can never drain.
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
	const bytesPerFrame = Math.max(0, width) * Math.max(0, height) * 4;
	const byBytes =
		bytesPerFrame > 0
			? Math.floor(EXPORT_FRAME_QUEUE_BUDGET_BYTES / bytesPerFrame)
			: MAX_FRAME_QUEUE_DEPTH;
	// `cores || 1` also maps NaN → 1 so a bad reading can never poison the
	// result (Math.max(2, NaN) is NaN).
	const safeCores = Math.max(1, cores || 1);
	const coreCeiling = Math.min(
		MAX_FRAME_QUEUE_DEPTH,
		Math.max(MIN_FRAME_QUEUE_DEPTH, safeCores),
	);

	return Math.min(
		Math.max(MIN_FRAME_QUEUE_DEPTH, byBytes),
		coreCeiling,
	);
}

/** Reads the host CPU core count, falling back to 1 when unavailable. */
function detectHardwareConcurrency(): number {
	return (
		(typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 1
	);
}

/* ── Memory / quota pre-flight ───────────────────────────────────────────
 *
 * A long export can run for many minutes and only discover an out-of-quota or
 * out-of-memory condition at the very end, after all the work is done. The
 * pre-flight below turns that failure into an up-front decision: either refuse
 * to start, or start with fewer workers so the run can actually finish.
 */

/**
 * Bits per pixel per frame, per quality tier, used to predict output size.
 *
 * Mediabunny derives its target bitrate internally from a subjective
 * `Quality` factor and exposes no bits-per-second helper, so the estimate
 * models it. 0.16 bpp/frame at 1080p30 is ~10 Mbps — the middle of the
 * measured 300-560 MB band for a 5-minute 1080p `high` export. The values are
 * deliberately mid-range: the safety factor below absorbs the error, and a
 * false "will not fit" is a worse outcome than a slightly optimistic estimate.
 */
const BITS_PER_PIXEL_PER_FRAME: Record<ExportQuality, number> = {
	low: 0.05,
	medium: 0.1,
	high: 0.16,
	very_high: 0.24,
};

/**
 * Headroom factor applied to the size estimate. Container overhead (moov atom,
 * audio headers) and VBR overshoot push real files above the nominal bitrate,
 * so the estimate is inflated before it is compared against real headroom.
 */
const EXPORT_SIZE_SAFETY_FACTOR = 1.15;

/** Fixed per-worker cost that does not scale with resolution. */
const EXPORT_WORKER_OVERHEAD_BYTES = 96 * 1024 * 1024;

/** Main-thread cost: preview WebGPU device, mixdown AudioBuffer, muxer. */
const EXPORT_MAIN_THREAD_OVERHEAD_BYTES = 192 * 1024 * 1024;

/**
 * Share of `navigator.deviceMemory` an export may claim. The rest belongs to
 * the tab, the compositor, and the OS. `navigator.deviceMemory` is capped at
 * 8 by browsers for privacy, so this budget is deliberately conservative.
 */
const EXPORT_DEVICE_MEMORY_SHARE = 0.5;

/** Output size headroom used when the browser reports no quota at all. */
const ASSUMED_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

export interface ExportMemoryPlan {
	/** Predicted size of the muxed output. */
	estimatedOutputBytes: number;
	/** Bytes the export will occupy in OPFS (0 when it is not disk-backed). */
	estimatedDiskBytes: number;
	/** Peak working set for the planned configuration, in RAM + retained frames. */
	estimatedPeakBytes: number;
	/** OPFS quota minus current usage, or `null` when the browser won't say. */
	storageHeadroomBytes: number | null;
	/** `navigator.deviceMemory` in GiB, or `null` when unavailable. */
	deviceMemoryGb: number | null;
	/** Worker count the export may safely use. Always ≥ 1. */
	workerCount: number;
	/** True when the export provably cannot finish — do not start it. */
	insufficient: boolean;
	/** Human-readable explanation, set only when `insufficient` is true. */
	reason: string | null;
}

/**
 * Decide whether an export fits, and with how many workers, before it starts.
 *
 * Pure: every browser-reported input is passed in, so the policy is unit
 * testable and the caller keeps control of where the numbers come from.
 *
 * @param diskCopies How many copies of the output land on disk at once:
 *   `0` = the output is held in RAM (buffer mode), `1` = a single streamed
 *   output, `2` = streamed segment files plus the streamed concatenation.
 *   The parallel path needs 2 because both exist simultaneously until the
 *   segments are deleted.
 */
export function planExportMemory({
	durationSeconds,
	width,
	height,
	fps,
	quality,
	includeAudio,
	audioBitrate = 128_000,
	requestedWorkerCount,
	diskCopies,
	storageQuotaBytes = null,
	storageUsageBytes = null,
	deviceMemoryGb = null,
}: {
	durationSeconds: number;
	width: number;
	height: number;
	fps: number;
	quality: ExportQuality;
	includeAudio: boolean;
	/** Fixed audio bitrate used for the size estimate. */
	audioBitrate?: number;
	requestedWorkerCount: number;
	diskCopies: number;
	storageQuotaBytes?: number | null;
	storageUsageBytes?: number | null;
	deviceMemoryGb?: number | null;
}): ExportMemoryPlan {
	const safeSeconds = Number.isFinite(durationSeconds)
		? Math.max(0, durationSeconds)
		: 0;
	const safeFps = Number.isFinite(fps) ? Math.max(0, fps) : 0;
	const pixels = Math.max(0, width) * Math.max(0, height);
	const bpp = BITS_PER_PIXEL_PER_FRAME[quality] ?? 0.16;

	// bitrate = pixels/frame * fps * bits/pixel/frame; bytes = bits / 8.
	const videoBits = pixels * safeFps * bpp * safeSeconds;
	const audioBits = includeAudio ? audioBitrate * safeSeconds : 0;
	const estimatedOutputBytes = Math.ceil(
		((videoBits + audioBits) / 8) * EXPORT_SIZE_SAFETY_FACTOR,
	);
	const safeDiskCopies = Number.isFinite(diskCopies)
		? Math.max(0, Math.floor(diskCopies))
		: 0;
	const estimatedDiskBytes = estimatedOutputBytes * safeDiskCopies;

	// Per-worker working set: fixed runtime plus the retained frame pipeline.
	const frameBytes = pixels * 4;
	const queueDepth = getExportRenderQueueDepth({ width, height });
	const perWorkerBytes =
		EXPORT_WORKER_OVERHEAD_BYTES + frameBytes * queueDepth;

	const requested = Number.isFinite(requestedWorkerCount)
		? Math.max(1, Math.floor(requestedWorkerCount))
		: 1;
	const ramBudgetBytes =
		deviceMemoryGb !== null &&
		Number.isFinite(deviceMemoryGb) &&
		deviceMemoryGb > 0
			? deviceMemoryGb * 1024 * 1024 * 1024 * EXPORT_DEVICE_MEMORY_SHARE
			: null;

	// Shrink the worker fan-out until the estimated peak fits the RAM budget.
	// Buffer mode additionally holds the whole output in RAM, so it is charged
	// against the budget before sizing the workers.
	const bufferOutputBytes = safeDiskCopies > 0 ? 0 : estimatedOutputBytes;
	let workerCount = requested;
	if (ramBudgetBytes !== null) {
		const fixed = EXPORT_MAIN_THREAD_OVERHEAD_BYTES + bufferOutputBytes;
		const affordable = Math.floor(
			(ramBudgetBytes - fixed) / Math.max(1, perWorkerBytes),
		);
		workerCount = Math.max(1, Math.min(requested, affordable));
	}
	const estimatedPeakBytes =
		EXPORT_MAIN_THREAD_OVERHEAD_BYTES +
		workerCount * perWorkerBytes +
		bufferOutputBytes;

	// Unknown quota: assume 2 GiB rather than assuming "unlimited", so a
	// pathological estimate still refuses to start on a browser that hides
	// StorageManager numbers. A real quota always wins when present.
	const quotaBytes =
		storageQuotaBytes !== null &&
		Number.isFinite(storageQuotaBytes) &&
		storageQuotaBytes > 0
			? storageQuotaBytes
			: ASSUMED_QUOTA_BYTES;
	const usageBytes =
		storageUsageBytes !== null &&
		Number.isFinite(storageUsageBytes) &&
		storageUsageBytes > 0
			? storageUsageBytes
			: 0;
	const storageHeadroomBytes: number | null =
		storageQuotaBytes !== null &&
		Number.isFinite(storageQuotaBytes) &&
		storageQuotaBytes > 0
			? Math.max(0, quotaBytes - usageBytes)
			: null;

	let reason: string | null = null;
	if (
		estimatedDiskBytes > 0 &&
		estimatedDiskBytes > quotaBytes - usageBytes
	) {
		reason =
			`Not enough storage for this export: it needs about ` +
			`${formatMegabytes(estimatedDiskBytes)} but only ` +
			`${formatMegabytes(Math.max(0, quotaBytes - usageBytes))} is available. ` +
			`Free up disk space or export a shorter timeline.`;
	} else if (
		ramBudgetBytes !== null &&
		EXPORT_MAIN_THREAD_OVERHEAD_BYTES + perWorkerBytes > ramBudgetBytes
	) {
		reason =
			`This export needs more memory than this device has available ` +
			`(${deviceMemoryGb}GB reported). Try a smaller resolution or quality.`;
	} else if (
		ramBudgetBytes !== null &&
		bufferOutputBytes + estimatedPeakBytes > ramBudgetBytes
	) {
		reason =
			`The rendered output alone needs about ${formatMegabytes(bufferOutputBytes)}, ` +
			`which does not fit alongside the render pipeline on this device.`;
	}

	return {
		estimatedOutputBytes,
		estimatedDiskBytes,
		estimatedPeakBytes,
		storageHeadroomBytes,
		deviceMemoryGb,
		workerCount,
		insufficient: reason !== null,
		reason,
	};
}

/** Compact binary-size label for pre-flight messages. */
function formatMegabytes(bytes: number): string {
	const megabytes = bytes / (1024 * 1024);
	if (megabytes >= 1024) return `${(megabytes / 1024).toFixed(1)} GB`;
	return `${Math.max(1, Math.round(megabytes))} MB`;
}

/**
 * Read the browser's storage quota / usage and device RAM for the pre-flight.
 *
 * Never throws: a browser that hides `StorageManager.estimate` or
 * `navigator.deviceMemory` yields `null`, which the planner treats as unknown
 * rather than as zero.
 */
export async function readExportHostHeadroom(): Promise<{
	storageQuotaBytes: number | null;
	storageUsageBytes: number | null;
	deviceMemoryGb: number | null;
}> {
	let storageQuotaBytes: number | null = null;
	let storageUsageBytes: number | null = null;
	try {
		const estimate = await navigator.storage?.estimate?.();
		if (estimate) {
			storageQuotaBytes = estimate.quota ?? null;
			storageUsageBytes = estimate.usage ?? null;
		}
	} catch {
		// Unknown quota — the planner substitutes a conservative default.
	}
	const deviceMemoryGb =
		typeof navigator === "undefined"
			? null
			: ((navigator as Navigator & { deviceMemory?: number })
					.deviceMemory ?? null);
	return { storageQuotaBytes, storageUsageBytes, deviceMemoryGb };
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
