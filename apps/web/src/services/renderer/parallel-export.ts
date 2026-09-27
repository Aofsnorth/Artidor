/**
 * Parallel (multi-segment) export pipeline.
 *
 * The single-worker exporter renders + encodes the whole timeline on one
 * worker, one frame at a time. That leaves most of a multi-core machine idle.
 * This module is the CapCut-style approach: split the timeline into N
 * contiguous frame ranges ("segments"), render + encode each segment on its
 * own worker (its own OffscreenCanvas, WebGPU device and decoder) fully in
 * parallel, then stitch the encoded segments back together at the *packet*
 * level — no re-encode, so the output is bit-for-bit the same quality as a
 * serial export, just produced ~N× faster.
 *
 * Why stitching is lossless and seamless:
 * - Every worker's encoder starts fresh, so each segment begins with a key
 *   frame (IDR). Concatenating key-frame-aligned segments needs no re-encode.
 * - All workers are pinned to the *same* negotiated codec, so every segment's
 *   bitstream is mutually compatible (shared decoder config).
 * - Each segment is encoded with segment-local (0-based) timestamps; on
 *   concatenation we add a constant offset equal to the segment's global start
 *   time. Because the tick→seconds mapping is linear, the resulting global
 *   timestamps are identical to what a serial export would have produced —
 *   uniform frame spacing with no gap or overlap at segment boundaries.
 *
 * Audio is encoded exactly once during concatenation (from the pre-mixed
 * buffer), never per segment.
 *
 * Segments and the stitched result are disk-backed (OPFS) whenever the browser
 * supports it, and the stitch reads its inputs straight from the file handles.
 * Peak RAM therefore stays flat instead of tracking ~2x the output size.
 *
 * The whole path is best-effort: callers should treat a thrown error or a
 * `{ fallback: true }` result as "use the single-worker exporter instead", so
 * a parallel-path problem can never block an export.
 */

import {
	ALL_FORMATS,
	AudioBufferSource,
	BlobSource,
	BufferTarget,
	EncodedPacketSink,
	EncodedVideoPacketSource,
	Input,
	Mp4OutputFormat,
	Output,
	StreamTarget,
	WebMOutputFormat,
} from "mediabunny";
import type { FrameRate } from "artidor-wasm";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { frameRateToFloat } from "@/lib/fps/utils";
import type { ExportFormat, ExportQuality } from "@/lib/export";
import {
	detectHardware,
	recommendExportWorkerCount,
} from "@/lib/export/hardware";
import type { SerializedNode } from "./scene-serializer";
import {
	audioBitrateFor,
	isEncoderConfigError,
	negotiateAudioCodec,
	negotiateVideoCodec,
	type ExportVideoCodec,
} from "./export-codec";
import {
	runExportInWorker,
	type ExportWorkerResult,
} from "./export-worker-bridge";
import { waitForWorkerGpuReady } from "./export-performance";
import {
	createExportTempFile,
	deleteExportTempFileByName,
	exportTempExtensionForFormat,
	isDiskBackedExportSupported,
	openStreamedExportFile,
} from "./export-output";
import {
	buildSegmentPlans,
	MIN_FRAMES_PER_SEGMENT,
	shouldUseParallelExport,
	type SegmentPlan,
} from "./segment-plan";
import { isStaticScene } from "./static-scene";

export type ParallelExportResult =
	| ExportWorkerResult
	| { success: false; fallback: true };

/**
 * Share of the progress bar owned by the segment phase. The remainder tracks
 * the concatenation, which is real work on the main thread and used to report
 * nothing at all — the bar sat frozen at 100% while a ~560 MB stitch ran.
 */
const CONCAT_PROGRESS_SHARE = 0.9;

/**
 * Upper bound on how long the launcher waits for a worker's GPU-ready signal
 * before launching the next one.
 *
 * `onReady` fires after `initializeGpu()` actually completes, so the normal
 * case returns as soon as the worker is past its adapter request. This bound
 * only matters when a worker dies or never signals, and must stay under the
 * bridge's 10s "no first message" cap so one broken worker cannot stall the
 * whole ladder.
 */
const GPU_READY_FALLBACK_MS = 5_000;

/**
 * Packets copied between event-loop yields. Small enough that a yield lands
 * every few tens of milliseconds, large enough that the `setTimeout` cost is
 * noise against a multi-second stitch.
 */
const CONCAT_PACKETS_PER_YIELD = 256;

/** A finished segment: either an OPFS file or an in-RAM buffer. */
type SegmentArtifact = {
	/** Global start time of the segment in seconds (the concat offset). */
	offset: number;
	/** Segment size, used to weight concatenation progress by bytes. */
	totalBytes: number;
	/** OPFS temp file name when the segment was streamed to disk. */
	fileName?: string;
	/** In-RAM muxed bytes when OPFS was unavailable. */
	buffer?: ArrayBuffer;
};

/**
 * Indexes of the segments worth one more attempt.
 *
 * Exported because the policy matters on its own: a segment that succeeded (or
 * produced a file) is finished work that a retry must never touch, and a
 * cancelled segment must not be relaunched — the user asked to stop.
 */
export function selectRetryableSegmentIndexes(
	results: ExportWorkerResult[],
): number[] {
	const indexes: number[] = [];
	for (const [index, result] of results.entries()) {
		if (result.success) continue;
		if ("cancelled" in result) continue;
		indexes.push(index);
	}
	return indexes;
}

/**
 * Yield the main thread to the *event loop*, not just the microtask queue.
 *
 * The concatenation loop awaits tens of thousands of times; chaining only
 * microtasks lets the browser starve — no paint, no progress, and cancel
 * (Escape) messages never get delivered. `scheduler.yield()` is used when the
 * browser has it, with a `setTimeout` macrotask as the portable fallback.
 */
function yieldToEventLoop(): Promise<void> {
	const scheduler = (
		globalThis as unknown as {
			scheduler?: { yield?: () => Promise<void> };
		}
	).scheduler;
	if (typeof scheduler?.yield === "function") return scheduler.yield();
	return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * Launch one worker per plan, staggering each start on the *previous* worker's
 * GPU-ready signal, and resolve with the results in plan order.
 *
 * The stagger exists because `navigator.gpu.requestAdapter()` can deadlock on
 * Windows when several workers call it in the same instant, so worker N+1 is
 * held back until worker N reports that its device exists. `run` receives the
 * signal to hand to the worker's `onReady`; without it every start would wait
 * out the full fallback delay instead of the real one.
 */
async function launchSegments(
	plans: SegmentPlan[],
	run: (
		plan: SegmentPlan,
		onGpuReady: () => void,
	) => Promise<ExportWorkerResult>,
): Promise<ExportWorkerResult[]> {
	const settled: ExportWorkerResult[] = new Array(plans.length);
	const pending: Promise<void>[] = [];
	for (const [i, plan] of plans.entries()) {
		let signalGpuReady: (() => void) | undefined;
		const gpuReady = new Promise<void>((resolve) => {
			signalGpuReady = resolve;
		});
		pending.push(
			run(plan, () => signalGpuReady?.()).then((result) => {
				settled[i] = result;
			}),
		);
		if (i < plans.length - 1) {
			await waitForWorkerGpuReady(gpuReady, GPU_READY_FALLBACK_MS);
		}
	}
	await Promise.all(pending);
	return settled;
}

/**
 * Render + encode every segment in parallel, then concatenate them.
 *
 * Returns `{ fallback: true }` when parallelism isn't worthwhile so the caller
 * can transparently use the single-worker exporter. Throws on unexpected
 * errors (also a signal to fall back).
 */
export async function runParallelExport({
	sceneTree,
	files,
	audioBuffer,
	width,
	height,
	fps,
	durationTicks,
	format,
	quality,
	shouldIncludeAudio,
	workerCount,
	maxWorkerCount,
	onProgress,
	getCancelled,
}: {
	sceneTree: SerializedNode;
	files: Array<{ mediaId: string; file: File }>;
	audioBuffer: AudioBuffer | null;
	width: number;
	height: number;
	fps: FrameRate;
	durationTicks: number;
	format: ExportFormat;
	quality: ExportQuality;
	shouldIncludeAudio: boolean;
	/** Override auto-detected worker count. */
	workerCount?: number;
	/**
	 * Ceiling applied to the auto-detected worker count, never a floor. The
	 * memory pre-flight passes the fan-out the device can actually hold, so a
	 * low-RAM machine trades a little speed for an export that finishes instead
	 * of aborting out of memory. Ignored when `workerCount` is set explicitly.
	 */
	maxWorkerCount?: number;
	onProgress?: ({ progress }: { progress: number }) => void;
	getCancelled?: () => boolean;
}): Promise<ParallelExportResult> {
	const fpsFloat = frameRateToFloat(fps);
	const ticksPerFrame = Math.round(
		(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
	);
	const totalFrames = Math.floor(durationTicks / ticksPerFrame);

	// A held still frame has no render work to parallelize. The reusable single
	// worker can encode one long-duration sample without worker startup or muxing.
	if (isStaticScene({ sceneTree, durationTicks })) {
		return { success: false, fallback: true };
	}

	// Determine segment count: explicit override > auto-detect from hardware.
	const hasWorkerOverride = workerCount !== undefined && workerCount > 0;
	// Two workers are the cheapest parallel configuration. If even that cannot
	// amortize startup, skip GPU adapter detection and use the warm worker now.
	if (
		!hasWorkerOverride &&
		!shouldUseParallelExport({
			totalFrames,
			width,
			height,
			segmentCount: 2,
		})
	) {
		return { success: false, fallback: true };
	}

	let segmentCount: number;
	if (hasWorkerOverride) {
		segmentCount = workerCount;
	} else {
		const hardware = await detectHardware();
		segmentCount = recommendExportWorkerCount({ hardware, width, height });
		// The caller's ceiling (memory pre-flight) only ever narrows the
		// auto-detected count.
		if (maxWorkerCount !== undefined) {
			segmentCount = Math.min(segmentCount, maxWorkerCount);
		}
	}
	// Still cap by timeline length — tiny timelines don't benefit from many workers.
	segmentCount = Math.min(
		segmentCount,
		Math.floor(totalFrames / MIN_FRAMES_PER_SEGMENT),
	);
	if (!hasWorkerOverride) {
		while (
			segmentCount > 1 &&
			!shouldUseParallelExport({
				totalFrames,
				width,
				height,
				segmentCount,
			})
		) {
			segmentCount -= 1;
		}
	}
	if (segmentCount < 2) {
		return { success: false, fallback: true };
	}

	// Pin one codec for every segment up-front so the bitstreams are mutually
	// compatible and can be stitched without a re-encode.
	const { codec: videoCodec, outputFormat: negotiatedFormat } =
		await negotiateVideoCodec({
			format,
			quality,
			width,
			height,
			fpsFloat,
		});

	const plans = buildSegmentPlans({
		totalFrames,
		count: segmentCount,
		ticksPerFrame,
		ticksPerSecond: TICKS_PER_SECOND,
	});

	// Aggregate progress across segments, weighted by each segment's frame count.
	// The segment phase only owns `CONCAT_PROGRESS_SHARE` of the bar so the
	// concatenation can report its own progress instead of appearing as a hang.
	const segmentProgress = new Array<number>(segmentCount).fill(0);
	const reportProgress = () => {
		if (!onProgress) return;
		let done = 0;
		for (const plan of plans) {
			done += (segmentProgress[plan.index] ?? 0) * plan.frames;
		}
		const share = totalFrames > 0 ? done / totalFrames : 0;
		onProgress({ progress: share * CONCAT_PROGRESS_SHARE });
	};

	// Stream every segment straight to an OPFS temp file when the browser
	// supports it. Holding all segments as ArrayBuffers simultaneously costs
	// ~2x the final file size in RAM (every segment plus the concatenation
	// result), which is what killed long exports. The worker falls back to a
	// buffer on its own when OPFS is unavailable, so both artifacts are handled.
	const diskBacked = isDiskBackedExportSupported();

	// OPFS temp files handed over by finished segments. The bridge forgets
	// them on success, so this function owns their lifetime from the moment it
	// adopts them: they are deleted on cancel, on error, and after a
	// successful stitch.
	const ownedFiles = new Set<string>();
	const discardOwnedFiles = () => {
		for (const fileName of ownedFiles) void deleteExportTempFileByName(fileName);
		ownedFiles.clear();
	};

	const runSegment = (
		plan: SegmentPlan,
		{
			forceSoftwareEncoding = false,
			onGpuReady,
		}: { forceSoftwareEncoding?: boolean; onGpuReady?: () => void } = {},
	): Promise<ExportWorkerResult> =>
		runExportInWorker({
			sceneTree,
			files,
			audioBuffer: null,
			width,
			height,
			fps,
			format,
			quality,
			shouldIncludeAudio: false,
			videoOnly: true,
			videoCodec,
			startFrame: plan.startFrame,
			endFrame: plan.endFrame,
			// 60s no-activity timeout. Segments that are just slow keep
			// sending progress messages, so this only fires when a worker is
			// truly stuck.
			timeoutMs: 60_000,
			reuseWorker: false,
			streamToDisk: diskBacked,
			forceSoftwareEncoding,
			onReady: onGpuReady,
			onProgress: ({ progress }) => {
				segmentProgress[plan.index] = progress;
				reportProgress();
			},
			getCancelled,
		});

	const launch = (
		targets: SegmentPlan[],
		forceSoftwareEncoding: (plan: SegmentPlan) => boolean,
	) =>
		launchSegments(targets, (plan, onGpuReady) => {
			const force = forceSoftwareEncoding(plan);
			// A retried segment restarts from 0%; its finished siblings keep
			// their reported progress so the bar never jumps backwards overall.
			segmentProgress[plan.index] = 0;
			reportProgress();
			return runSegment(plan, { forceSoftwareEncoding: force, onGpuReady });
		});

	const results = await launch(plans, () => false);

	// Retry ONLY the failed segments, keeping every finished artifact.
	//
	// The caller's ladder (parallel → single worker → main thread) restarts the
	// whole export from frame 0, so one flaky segment used to throw away
	// minutes of completed work. A single retry per segment is enough for the
	// two failure modes that actually happen: a transient worker crash, and a
	// hardware encoder configuration that `isConfigSupported` wrongly
	// accepted — the retry forces software encoding, which leaves the pinned
	// codec (and therefore bitstream compatibility with the sibling segments)
	// untouched.
	const failedIndexes = selectRetryableSegmentIndexes(results);
	if (failedIndexes.length > 0) {
		console.warn(
			`[export] ${failedIndexes.length} parallel segment(s) failed, retrying only those`,
		);
		const retryForce = (plan: SegmentPlan) => {
			const failure = results[plan.index];
			return !failure.success && "error" in failure
				? isEncoderConfigError(failure.error)
				: false;
		};
		const retried = await launch(
			failedIndexes.map((index) => plans[index]),
			retryForce,
		);
		failedIndexes.forEach((planIndex, slot) => {
			results[planIndex] = retried[slot];
		});
	}

	// Collect the finished artifacts and take ownership of every streamed
	// segment file. `ownedFiles` is the only thing that will ever delete them.
	const segments: SegmentArtifact[] = [];
	let segmentError: string | null = null;
	let wasCancelled = false;
	for (const [index, result] of results.entries()) {
		const offset = plans[index].startSeconds;
		if (result.success) {
			if (result.streamed) {
				ownedFiles.add(result.streamed.fileName);
				segments.push({
					offset,
					totalBytes: result.streamed.byteLength,
					fileName: result.streamed.fileName,
				});
			} else if (result.buffer) {
				segments.push({
					offset,
					totalBytes: result.buffer.byteLength,
					buffer: result.buffer,
				});
			} else {
				segmentError ??= "Segment export produced no output";
			}
		} else if ("cancelled" in result) {
			wasCancelled = true;
		} else {
			segmentError ??= result.error;
		}
	}

	if (wasCancelled || getCancelled?.()) {
		discardOwnedFiles();
		return { success: false, cancelled: true };
	}

	// A segment that still fails after its retry is a real error: throw so the
	// caller falls back to the single-worker exporter.
	if (segmentError !== null) {
		discardOwnedFiles();
		throw new Error(`Parallel segment failed: ${segmentError}`);
	}

	let concatenated: ExportWorkerResult;
	try {
		concatenated = await concatenateSegments({
			segments,
			format: negotiatedFormat,
			videoCodec,
			fpsFloat,
			audioBuffer: shouldIncludeAudio ? audioBuffer : null,
			onProgress: ({ progress }) =>
				onProgress?.({
					progress:
						CONCAT_PROGRESS_SHARE + (1 - CONCAT_PROGRESS_SHARE) * progress,
				}),
			getCancelled,
		});
	} finally {
		// The segments have been copied packet-by-packet (or the stitch failed
		// and they are worthless), so they are released on every exit — this
		// `finally` is what keeps a throwing stitch from orphaning every
		// segment file in OPFS.
		discardOwnedFiles();
	}

	if (!concatenated.success) return concatenated;

	onProgress?.({ progress: 1 });
	return concatenated;
}

/**
 * Stitch segment files into one output by copying their encoded video packets
 * (offset to global time) into a single track — no re-encode — and muxing the
 * pre-mixed audio once.
 *
 * Segments that were streamed to disk are read straight from their OPFS
 * `File`: an OPFS file is a `Blob`, so mediabunny reads it lazily through a
 * bounded cache instead of materialising the segment in RAM. The stitched
 * output is handed over as an OPFS file too, so the whole pipeline stays
 * disk-backed end to end and peak RAM never tracks the output size.
 */
async function concatenateSegments({
	segments,
	format,
	videoCodec,
	fpsFloat,
	audioBuffer,
	onProgress,
	getCancelled,
}: {
	segments: SegmentArtifact[];
	format: ExportFormat;
	videoCodec: ExportVideoCodec;
	fpsFloat: number;
	audioBuffer: AudioBuffer | null;
	onProgress?: ({ progress }: { progress: number }) => void;
	getCancelled?: () => boolean;
}): Promise<ExportWorkerResult> {
	const outputFormat =
		format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();
	// The container was decided by negotiation (which can flip mp4 → webm), so
	// the temp file gets the negotiated suffix and the download keeps its type.
	const tempOutput = isDiskBackedExportSupported()
		? await createExportTempFile(exportTempExtensionForFormat(format))
		: null;
	const target = tempOutput
		? new StreamTarget(tempOutput.stream, { chunked: true })
		: new BufferTarget();
	const output = new Output({ format: outputFormat, target });

	const videoSource = new EncodedVideoPacketSource(videoCodec);
	output.addVideoTrack(videoSource, { frameRate: fpsFloat });

	let audioSource: AudioBufferSource | null = null;
	if (audioBuffer) {
		const audioCodec = await negotiateAudioCodec({
			format,
			sampleRate: audioBuffer.sampleRate,
			numberOfChannels: audioBuffer.numberOfChannels,
		});
		audioSource = new AudioBufferSource({
			codec: audioCodec,
			bitrate: audioBitrateFor(audioCodec),
		});
		output.addAudioTrack(audioSource);
	}

	// Abort path: release the muxer and delete the half-written file so a
	// cancelled or failed stitch leaves nothing behind in OPFS. Every step is
	// best-effort — this runs on the cancel and error paths and must never
	// replace the cancellation or the error message the user needs to see.
	const abortOutput = async () => {
		try {
			videoSource.close();
		} catch {
			// Already closed, or the output never started.
		}
		try {
			audioSource?.close();
		} catch {
			// Already closed, or the output never started.
		}
		await output.cancel().catch(() => {});
		await tempOutput?.remove().catch(() => {});
	};

	try {
		await output.start();

		// Encode the audio once, concurrently with the video packet copy.
		const audioEncode =
			audioSource && audioBuffer
				? audioSource.add(audioBuffer).finally(() => {
						audioSource?.close();
					})
				: null;

		// The decoder config from the first segment applies to all segments (they
		// share an identical encoder config); it must be supplied on the first
		// `add()` so the muxer can write the track's codec metadata.
		let isFirstPacket = true;

		// Progress is weighted by bytes copied rather than by packet count: the
		// total packet count is unknown up front, but every segment's size is.
		const totalBytes = segments.reduce((sum, seg) => sum + seg.totalBytes, 0);
		const reportBytes = (copied: number) => {
			if (!onProgress) return;
			onProgress({
				progress: totalBytes > 0 ? Math.min(1, copied / totalBytes) : 1,
			});
		};
		let copiedBytes = 0;

		for (const segment of segments) {
			if (getCancelled?.()) {
				await abortOutput();
				return { success: false, cancelled: true };
			}
			// Read a streamed segment directly off disk. `Blob` over the
			// ArrayBuffer is a view, not a copy, so the buffer path costs
			// nothing extra.
			const source = segment.fileName
				? await openStreamedExportFile(segment.fileName)
				: new Blob([segment.buffer as ArrayBuffer]);
			const input = new Input({
				source: new BlobSource(source),
				formats: ALL_FORMATS,
			});
			try {
				const track = await input.getPrimaryVideoTrack();
				if (!track) {
					throw new Error("Segment has no video track");
				}
				const sink = new EncodedPacketSink(track);
				const decoderConfig = isFirstPacket
					? await track.getDecoderConfig()
					: undefined;

				// Packets are read in decode order with their presentation
				// timestamps; offsetting every timestamp by the segment's global
				// start keeps decode order intact and yields continuous global PTS.
				let packet = await sink.getFirstPacket();
				let sinceYield = 0;
				while (packet) {
					if (getCancelled?.()) {
						await abortOutput();
						return { success: false, cancelled: true };
					}
					const shifted = packet.clone({
						timestamp: packet.timestamp + segment.offset,
					});
					await videoSource.add(
						shifted,
						isFirstPacket && decoderConfig
							? { decoderConfig: decoderConfig as VideoDecoderConfig }
							: undefined,
					);
					isFirstPacket = false;
					copiedBytes += packet.byteLength;
					packet = await sink.getNextPacket(packet);

					// Hand the main thread back periodically so the bar keeps
					// moving and a cancel (Escape) is actually delivered.
					if (++sinceYield >= CONCAT_PACKETS_PER_YIELD) {
						sinceYield = 0;
						reportBytes(copiedBytes);
						await yieldToEventLoop();
					}
				}
				reportBytes(copiedBytes);
			} finally {
				input.dispose();
			}
		}

		videoSource.close();
		if (audioEncode) await audioEncode;
		await output.finalize();
	} catch (error) {
		await abortOutput();
		throw error;
	}

	if (tempOutput) {
		// Hand the finished file over rather than reading it back. Reading it
		// would re-inflate peak RAM to the file size — exactly what streaming
		// the segments was supposed to avoid. Ownership of the file passes to
		// the caller, which opens it once for preview/download.
		const byteLength = (await tempOutput.handle.getFile()).size;
		return { success: true, streamed: { byteLength, fileName: tempOutput.name } };
	}
	const buffer = target instanceof BufferTarget ? target.buffer : null;
	if (!buffer) throw new Error("Concatenation produced no buffer");
	return { success: true, buffer };
}
