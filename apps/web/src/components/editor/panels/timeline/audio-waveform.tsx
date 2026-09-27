"use client";

import { useCallback, useEffect, useRef } from "react";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import {
	createAudioContext,
	decodeMediaFileAudioBuffer,
} from "@/lib/media/audio";
import { yieldToEventLoop } from "@/lib/media/yield";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { findScrollParent } from "@/utils/browser";
import { cn } from "@/utils/ui";

const WAVEFORM_BAR_WIDTH = 2;
const WAVEFORM_BAR_GAP = 1;
const BEAT_BAR_WIDTH = 3;
const BEAT_BAR_GAP = 2;

// Resolution of the precomputed peak buffer. The raw audio is reduced to one
// peak per block so that scroll / resize redraws never touch the full sample
// data again.
const PEAK_BLOCK_SIZE = 256;

interface AudioWaveformProps {
	audioUrl?: string;
	mediaFile?: File;
	audioBuffer?: AudioBuffer;
	color?: string;
	beatColor?: string;
	symmetric?: boolean;
	variant?: WaveformVariant;
	className?: string;
	trimStartTicks?: number;
	trimEndTicks?: number;
	sourceDurationTicks?: number;
	scale?: number;
}

export type WaveformVariant =
	| "waveform"
	| "beats"
	| "lines"
	| "liquid"
	| "graph";

// ---------------------------------------------------------------------------
// Shared decode cache – keyed by File identity (or URL string) AND the trim
// window that was decoded.
// Multiple AudioWaveform instances pointing at the same underlying File share
// one decode, eliminating duplicate WASM work and lag. We only keep the
// downsampled peak buffer (not the full AudioBuffer) so memory stays small.
// ---------------------------------------------------------------------------

/** Downsampled peaks of a decoded buffer. */
export interface AudioPeaks {
	peakBuffer: Float32Array;
	bufferLength: number;
	globalPeak: number;
}

/**
 * Peaks plus how the clip's trim range sits *inside the decoded buffer*.
 *
 * A draw maps the visible part of the clip onto a sample range by scaling
 * these two ratios by `bufferLength`, so they have to be expressed against the
 * buffer the peaks were computed from:
 *  - full-source decode → the buffer is the whole file, so the ratios are the
 *    clip's trim fractions of the source duration;
 *  - windowed decode → the buffer *is* (a padded version of) the trim window,
 *    so the ratios are the padding that sits before / after the clip.
 */
export interface DecodedPeaks extends AudioPeaks {
	trimStartRatio: number;
	trimEndRatio: number;
}

/** A slice of a source file, in seconds. */
export interface DecodeWindowSeconds {
	startSeconds: number;
	durationSeconds: number;
}

/** The clip-side trim a waveform covers, in ticks. */
export interface WaveformTrim {
	trimStartTicks?: number;
	trimEndTicks?: number;
	sourceDurationTicks?: number;
}

/** The two ratio sets a decode can land on. */
interface TrimRatios {
	trimStartRatio: number;
	trimEndRatio: number;
}

export interface DecodePlan {
	/** Window to decode, or null to decode the whole source. */
	window: DecodeWindowSeconds | null;
	/**
	 * Ratios for a buffer that holds the whole source. Used whenever the
	 * windowed decode could not run (no File to window, or it failed and the
	 * fall-through decoded everything).
	 */
	sourceRatios: TrimRatios;
	/** Ratios for a buffer that holds only `window`. */
	windowRatios: TrimRatios;
}

/**
 * Decode windows snap outward to this grid so that dragging a trim edge
 * doesn't mint a new cache key — and a new decode — on every pointer move.
 * Snapping *outward* (never inward) is a correctness requirement: a window
 * that fell even a hair short of the clip would leave its last bars reading
 * past the end of the peak buffer, i.e. a flat spot at the clip's right edge.
 */
const WINDOW_QUANTUM_SECONDS = 0.5;

/**
 * Trim fractions of a buffer that holds the whole source. Kept in ticks (not
 * seconds) so an untrimmed clip's ratios are bit-for-bit what they were before
 * windows existed.
 */
export function computeSourceTrimRatios(trim: WaveformTrim): {
	trimStartRatio: number;
	trimEndRatio: number;
} {
	const { trimStartTicks, trimEndTicks, sourceDurationTicks } = trim;
	const duration =
		sourceDurationTicks && sourceDurationTicks > 0 ? sourceDurationTicks : 0;
	return {
		trimStartRatio:
			duration > 0 && trimStartTicks
				? Math.min(1, Math.max(0, trimStartTicks / duration))
				: 0,
		trimEndRatio:
			duration > 0 && trimEndTicks
				? Math.min(1, Math.max(0, trimEndTicks / duration))
				: 0,
	};
}

/**
 * Decides how much of a source file a clip needs decoded.
 *
 * A 1-hour 48 kHz stereo AudioBuffer is ~1.4 GB of float PCM, and it used to
 * be built in full for every mounted clip just to draw the 4 seconds the clip
 * actually shows — 2.8 GB for two clips of the same recording. The decoder
 * takes a window (`trimStartSeconds` / `durationSeconds`), so the fix is to ask
 * for the clip's trim range instead of the file. Windows are skipped when
 * there is no trustworthy source length to scale them against, and when the
 * trim removes less than a quantum of audio (windowing would then cost more
 * bookkeeping than it saves bytes).
 */
export function resolveDecodePlan(trim: WaveformTrim): DecodePlan {
	const sourceRatios = computeSourceTrimRatios(trim);
	const sourceSeconds =
		trim.sourceDurationTicks && trim.sourceDurationTicks > 0
			? trim.sourceDurationTicks / TICKS_PER_SECOND
			: 0;
	const trimStartSeconds = Math.max(
		0,
		(trim.trimStartTicks ?? 0) / TICKS_PER_SECOND,
	);
	const trimEndSeconds = Math.max(
		0,
		(trim.trimEndTicks ?? 0) / TICKS_PER_SECOND,
	);
	const clipSeconds = sourceSeconds - trimStartSeconds - trimEndSeconds;
	const trimmedSeconds = sourceSeconds - clipSeconds;

	// No window: one ratio set, used for whichever buffer comes back.
	const wholeSource: DecodePlan = {
		window: null,
		sourceRatios,
		windowRatios: sourceRatios,
	};

	if (sourceSeconds <= 0 || clipSeconds <= 0) return wholeSource;
	if (trimmedSeconds <= WINDOW_QUANTUM_SECONDS) return wholeSource;

	const startSeconds = Math.min(
		sourceSeconds,
		Math.floor(trimStartSeconds / WINDOW_QUANTUM_SECONDS) *
			WINDOW_QUANTUM_SECONDS,
	);
	const endSeconds = Math.min(
		sourceSeconds,
		Math.ceil((trimStartSeconds + clipSeconds) / WINDOW_QUANTUM_SECONDS) *
			WINDOW_QUANTUM_SECONDS,
	);
	const windowSeconds = Math.max(0, endSeconds - startSeconds);
	if (windowSeconds <= 0) return wholeSource;

	// The windowed buffer spans [startSeconds, endSeconds] of the source, so
	// its ratios are the padding inside that window, not fractions of the whole
	// file. Clamped because a float endpoint can land a hair outside it.
	const clampRatio = (value: number) => Math.min(1, Math.max(0, value));
	return {
		window: { startSeconds, durationSeconds: windowSeconds },
		sourceRatios,
		windowRatios: {
			trimStartRatio: clampRatio(
				(trimStartSeconds - startSeconds) / windowSeconds,
			),
			trimEndRatio: clampRatio(
				(endSeconds - (trimStartSeconds + clipSeconds)) / windowSeconds,
			),
		},
	};
}

interface DecodeCacheEntry {
	promise: Promise<DecodedPeaks>;
	/** `peakBuffer.byteLength`, 0 until the decode resolves. */
	bytes: number;
}

/**
 * Hard byte budget for the peak cache. Bytes, not entry count, are the real
 * constraint: an entry is ceil(samples / PEAK_BLOCK_SIZE) float32s, i.e.
 * 48000/256 ≈ 187 blocks/s ≈ 750 B per second of decoded audio no matter how
 * many channels it had, so a 1-hour source costs ~2.7 MB and a 24-hour field
 * recording ~65 MB. An entry-count cap would clip the 3 MB music files and let
 * the pathological ones through. 64 MB is ~24 hours of audio — well past a
 * normal session, so the cap only fires on the case it exists for, and the
 * least-recently-used entries go first.
 */
const MAX_DECODE_CACHE_BYTES = 64 * 1024 * 1024;

/**
 * LRU map: insertion order is use order (a hit re-inserts), so the front is
 * the least recently used entry.
 */
const DECODE_CACHE = new Map<string, DecodeCacheEntry>();
let decodeCacheBytes = 0;

/**
 * Drops least-recently-used entries until the retained peaks fit `budgetBytes`.
 * The newest entry is never dropped: a single source larger than the whole
 * budget would otherwise be evicted and re-decoded on every mount. Exposed
 * (and parameterised) so tests can exercise the order without allocating the
 * full 64 MB.
 */
export function evictDecodeCacheToBudget({
	budgetBytes,
}: {
	budgetBytes: number;
}): void {
	while (decodeCacheBytes > budgetBytes) {
		const oldestKey = DECODE_CACHE.keys().next().value;
		if (oldestKey === undefined || DECODE_CACHE.size <= 1) return;
		const oldest = DECODE_CACHE.get(oldestKey);
		if (oldest) decodeCacheBytes -= oldest.bytes;
		DECODE_CACHE.delete(oldestKey);
	}
}

/**
 * Peaks of a caller-supplied AudioBuffer, keyed on the buffer's identity.
 *
 * `audioBuffer` clips ran `computePeakBuffer` on every mount, and culling
 * remounts clips as the viewport moves — so an hour of audio meant tens of
 * millions of main-thread reads per remount, over and over. A WeakMap is the
 * tightest cap available: one entry per buffer, dropped as soon as the buffer
 * is garbage collected, so the cache can never outlive its key and needs no
 * eviction policy. Each entry is at most ceil(length / PEAK_BLOCK_SIZE) × 4
 * bytes (~750 B per second of audio), same per-second cost as the map above.
 */
const PEAK_CACHE = new WeakMap<AudioBuffer, Promise<AudioPeaks>>();

/** Cached peak computation for `buffer`. Exported for tests. */
export function getCachedPeaks(buffer: AudioBuffer): Promise<AudioPeaks> {
	const cached = PEAK_CACHE.get(buffer);
	if (cached) return cached;
	const promise = computePeakBuffer(buffer);
	PEAK_CACHE.set(buffer, promise);
	promise.catch(() => {
		if (PEAK_CACHE.get(buffer) === promise) PEAK_CACHE.delete(buffer);
	});
	return promise;
}

export function getCacheKey(
	audioUrl?: string,
	mediaFile?: File,
	window?: DecodeWindowSeconds | null,
): string {
	let key: string;
	if (mediaFile) {
		key = `file:${mediaFile.name}:${mediaFile.size}:${mediaFile.lastModified}`;
	} else if (audioUrl) {
		key = `url:${audioUrl}`;
	} else {
		return "";
	}
	// The window is part of the identity: the same file decoded for two
	// different trim ranges holds two different sets of peaks. Millisecond
	// precision keeps float tick noise from splitting one clip's key in two.
	if (window) {
		key += `|${Math.round(window.startSeconds * 1000)}`;
		key += `-${Math.round(window.durationSeconds * 1000)}`;
	}
	return key;
}

export async function decodeAndCache({
	cacheKey,
	audioUrl,
	mediaFile,
	plan,
}: {
	cacheKey: string;
	audioUrl: string | undefined;
	mediaFile: File | undefined;
	plan: DecodePlan;
}): Promise<DecodedPeaks> {
	const cached = DECODE_CACHE.get(cacheKey);
	if (cached) {
		// Re-insert so the map keeps least-recently-used order.
		DECODE_CACHE.delete(cacheKey);
		DECODE_CACHE.set(cacheKey, cached);
		return cached.promise;
	}

	const promise = (async (): Promise<DecodedPeaks> => {
		const audioContext = createAudioContext();
		try {
			let buffer: AudioBuffer | null = null;
			let isWindowed = false;

			// 0. Windowed decode — the timeline path. Only the clip's trim
			// range is materialised. Runs first so the whole-file decodes below
			// are skipped entirely; if it fails, the fall-through is exactly
			// the previous behaviour.
			if (plan.window && mediaFile) {
				buffer = await decodeMediaFileAudioBuffer({
					file: mediaFile,
					audioContext,
					trimStartSeconds: plan.window.startSeconds,
					durationSeconds: plan.window.durationSeconds,
				});
				isWindowed = buffer !== null;
			}

			// 1. Native decode for pure audio URLs (not video files).
			if (!buffer && audioUrl && !mediaFile?.type.startsWith("video/")) {
				try {
					const resp = await fetch(audioUrl);
					const arrayBuffer = await resp.arrayBuffer();
					buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
				} catch {
					// fall through to mediaFile path
				}
			}

			// 2. Native decode for pure audio files.
			if (!buffer && mediaFile) {
				const isAudioFile =
					mediaFile.type.startsWith("audio/") ||
					/\.(wav|mp3|m4a|aac|ogg|oga|opus|flac)$/i.test(mediaFile.name);
				if (isAudioFile) {
					try {
						const arrayBuffer = await mediaFile.arrayBuffer();
						buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
					} catch {
						// fall through to WASM extractor
					}
				}
			}

			// 3. WASM fallback for video files or failed native decode.
			if (!buffer && mediaFile) {
				buffer = await decodeMediaFileAudioBuffer({
					file: mediaFile,
					audioContext,
				});
			}

			if (!buffer) throw new Error("Could not decode audio");

			// The ratios must describe the buffer that actually came back: a
			// windowed one *is* the trim range (so they are the padding around
			// the clip), and anything the fall-through decoded holds the whole
			// source (so they are the clip's fractions of it). A window can also
			// be planned for a source with no File, which is always this case.
			return await computeDecodedPeaks(
				buffer,
				isWindowed ? plan.windowRatios : plan.sourceRatios,
			);
		} finally {
			audioContext.close().catch(() => {});
		}
	})();

	const entry: DecodeCacheEntry = { promise, bytes: 0 };
	DECODE_CACHE.set(cacheKey, entry);
	promise.then(
		(result) => {
			// Only the peaks outlive this closure — the decoded AudioBuffer goes
			// away with its AudioContext above.
			entry.bytes = result.peakBuffer.byteLength;
			if (DECODE_CACHE.get(cacheKey) !== entry) return;
			decodeCacheBytes += entry.bytes;
			evictDecodeCacheToBudget({ budgetBytes: MAX_DECODE_CACHE_BYTES });
		},
		() => {
			if (DECODE_CACHE.get(cacheKey) === entry) DECODE_CACHE.delete(cacheKey);
		},
	);
	return promise;
}

// ---------------------------------------------------------------------------
// Shared scroll ticker
// ---------------------------------------------------------------------------

/**
 * The horizontal slice of a scroll parent that is on screen right now, in
 * viewport coordinates.
 */
interface ScrollWindow {
	left: number;
	right: number;
}

interface ScrollTicker {
	subscribers: Set<(scrollWindow: ScrollWindow) => void>;
	frame: number | null;
}

/**
 * One scroll listener and one animation frame per scroll parent, shared by
 * every mounted clip.
 *
 * Each clip used to install its own listener on the same scroller and coalesce
 * with its own rAF, so a timeline with 40 visible clips ran 40 rAF callbacks
 * per frame and every one of them re-measured the *same* scroll parent to get
 * the same two numbers — 40 wasted `getBoundingClientRect` reads and layout
 * flushes per frame, which is exactly the kind of read that turns a smooth
 * scroll into a janky one. The ticker measures the parent once per frame and
 * hands the result to every subscriber.
 *
 * A draw triggered by anything other than scrolling (decode, resize, trim or
 * style change) measures the parent itself instead, so a panel resize that
 * produces no scroll event can never repaint from a stale window.
 */
const SCROLL_TICKERS = new WeakMap<HTMLElement, ScrollTicker>();

function measureScrollWindow(element: HTMLElement): ScrollWindow {
	const rect = element.getBoundingClientRect();
	return { left: rect.left, right: rect.right };
}

function subscribeScrollWindow(
	scrollParent: HTMLElement,
	onWindow: (scrollWindow: ScrollWindow) => void,
): () => void {
	let ticker = SCROLL_TICKERS.get(scrollParent);
	if (!ticker) {
		ticker = { subscribers: new Set(), frame: null };
		SCROLL_TICKERS.set(scrollParent, ticker);
	}
	const entry = ticker;
	entry.subscribers.add(onWindow);

	const onScroll = () => {
		if (entry.frame !== null) return;
		entry.frame = requestAnimationFrame(() => {
			entry.frame = null;
			const scrollWindow = measureScrollWindow(scrollParent);
			for (const notify of entry.subscribers) notify(scrollWindow);
		});
	};

	scrollParent.addEventListener("scroll", onScroll, { passive: true });

	return () => {
		scrollParent.removeEventListener("scroll", onScroll);
		entry.subscribers.delete(onWindow);
		if (entry.subscribers.size > 0) return;
		if (entry.frame !== null) cancelAnimationFrame(entry.frame);
		SCROLL_TICKERS.delete(scrollParent);
	};
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AudioWaveform({
	audioUrl,
	mediaFile,
	audioBuffer,
	color = "rgba(255, 255, 255, 0.7)",
	beatColor = "rgba(255, 255, 255, 0.95)",
	symmetric = false,
	variant = "waveform",
	className = "",
	trimStartTicks,
	trimEndTicks,
	sourceDurationTicks,
	scale = 1,
}: AudioWaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const decodedRef = useRef<DecodedPeaks | null>(null);
	const scrollParentRef = useRef<HTMLElement | null>(null);
	const publishedWindowRef = useRef<ScrollWindow | null>(null);
	const heightRef = useRef<number>(0);

	/**
	 * Paints the visible slice of the clip.
	 */
	const drawVisible = useCallback(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		const decoded = decodedRef.current;
		const height = heightRef.current;

		// Set by the shared scroll ticker for the duration of a scroll-driven
		// draw only; every other redraw (decode, resize, style change) leaves it
		// null and measures the scroll parent itself, so a resize that produces
		// no scroll event can never repaint from a stale window.
		const publishedWindow = publishedWindowRef.current;

		if (!container || !canvas || !decoded || height <= 0) return;

		const elementWidth = container.offsetWidth;
		if (elementWidth <= 0) return;

		// Only render the portion of the element currently visible inside its
		// scroll parent (timeline can be very wide). This keeps the canvas tiny
		// regardless of clip length.
		const containerRect = container.getBoundingClientRect();
		const scrollParent = scrollParentRef.current;

		let clipLeft: number;
		let clipRight: number;

		if (scrollParent) {
			const scrollWindow = publishedWindow ?? measureScrollWindow(scrollParent);
			clipLeft = Math.max(0, scrollWindow.left - containerRect.left);
			clipRight = Math.min(
				elementWidth,
				scrollWindow.right - containerRect.left,
			);
		} else {
			clipLeft = Math.max(0, -containerRect.left);
			clipRight = Math.min(
				elementWidth,
				window.innerWidth - containerRect.left,
			);
		}

		const visibleWidth = clipRight - clipLeft;
		if (visibleWidth <= 0) return;

		const dpr = window.devicePixelRatio || 1;
		const canvasW = Math.round(visibleWidth * dpr);
		const canvasH = Math.round(height * dpr);
		if (canvasW <= 0 || canvasH <= 0) return;

		// Assigning canvas.width/height reallocates the backing bitmap even when
		// the value is unchanged. While scrolling within one clip the size is
		// usually stable, so only touch the attributes when they actually differ.
		if (canvas.width !== canvasW) canvas.width = canvasW;
		if (canvas.height !== canvasH) canvas.height = canvasH;
		canvas.style.width = `${visibleWidth}px`;
		canvas.style.height = `${height}px`;
		canvas.style.left = `${clipLeft}px`;

		const barWidth = variant === "beats" ? BEAT_BAR_WIDTH : WAVEFORM_BAR_WIDTH;
		const barGap = variant === "beats" ? BEAT_BAR_GAP : WAVEFORM_BAR_GAP;
		const barStep = barWidth + barGap;
		const barCount = Math.max(1, Math.floor(visibleWidth / barStep));

		// Trim-aware source range. The element width maps to the *trimmed* region
		// of the decoded buffer, so we offset into the buffer accordingly before
		// applying the visible-window fractions. The ratios come from the decode
		// (see DecodedPeaks): a whole-source buffer is trimmed by the clip's
		// fractions of the source, a windowed one by the padding around the clip.
		const sourceStart = decoded.trimStartRatio * decoded.bufferLength;
		const sourceEnd =
			decoded.bufferLength - decoded.trimEndRatio * decoded.bufferLength;
		const sourceRange = Math.max(0, sourceEnd - sourceStart);

		const startFraction = clipLeft / elementWidth;
		const endFraction = clipRight / elementWidth;
		const startSample = Math.floor(sourceStart + startFraction * sourceRange);
		const endSample = Math.floor(sourceStart + endFraction * sourceRange);

		const peaks = extractPeakRange({
			peakBuffer: decoded.peakBuffer,
			count: barCount,
			startSample,
			endSample,
		});

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const safePeak = 1.0;
		const logBase = Math.log1p(1);

		// setTransform (not scale) so the dpr scaling is absolute. We no longer
		// reallocate the canvas every frame, so a multiplicative scale() would
		// compound across redraws.
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, canvasW, canvasH);

		// Mirrored (symmetric) beats keep a faint center baseline; bottom-anchored
		// beats intentionally omit it so no white line sits under the clip.
		if ((variant === "beats" || variant === "lines") && symmetric) {
			ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
			const baselineY = Math.floor(height / 2);
			ctx.fillRect(0, baselineY, visibleWidth, 1);
		}

		// Bottom-anchored bars grow in a single direction, so they get more of
		// the strip height than mirrored bars (which use it on both sides).
		const maxBarHeight =
			variant === "beats" || variant === "lines"
				? symmetric
					? height * 0.44
					: height * 0.85
				: variant === "graph"
					? symmetric
						? height * 0.45
						: height * 0.85
					: variant === "liquid"
						? symmetric
							? height * 0.42
							: height * 0.78
						: symmetric
							? height * 0.45
							: height * 0.7;
		const centerY = height / 2;

		// Graph mode: draw a smooth line through all peaks (no fill)
		if (variant === "graph") {
			drawGraphVariant({
				ctx,
				peaks,
				barStep,
				maxBarHeight,
				scale,
				symmetric,
				height,
				centerY,
				color,
				beatColor,
				logBase,
				visibleWidth,
			});
			ctx.shadowBlur = 0;
			return;
		}

		// Liquid mode: filled smooth wave with vertical gradient
		if (variant === "liquid") {
			drawLiquidVariant({
				ctx,
				peaks,
				barStep,
				maxBarHeight,
				symmetric,
				height,
				centerY,
				color,
				beatColor,
				logBase,
				visibleWidth,
			});
			ctx.shadowBlur = 0;
			return;
		}

		for (let i = 0; i < barCount; i++) {
			const normalized = Math.min(1, peaks[i] / safePeak);
			const scaled = Math.log1p(normalized) / logBase;
			const leftPeak = peaks[Math.max(0, i - 1)] ?? 0;
			const rightPeak = peaks[Math.min(peaks.length - 1, i + 1)] ?? 0;
			const isBeat =
				(variant === "beats" || variant === "lines") &&
				scaled > 0.32 &&
				peaks[i] >= leftPeak &&
				peaks[i] >= rightPeak;
			const rawBarH = Math.max(
				variant === "beats" || variant === "lines" ? 2 : 1,
				scaled * maxBarHeight,
			);
			const barH = rawBarH * scale;
			const x = i * barStep;
			const radius =
				variant === "beats" || variant === "lines" ? Math.min(barWidth, 2) : 0;

			const finalAmplitude = normalized * scale;
			const isOversound = finalAmplitude >= 1.0;

			if (isOversound) {
				ctx.fillStyle = "rgba(255, 255, 255, 1)";
				ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
				ctx.shadowBlur = 6;
			} else if (finalAmplitude > 0.7) {
				const ratio = (finalAmplitude - 0.7) / 0.3; // 0 to 1
				ctx.fillStyle = `rgba(255, 255, 255, ${0.55 + ratio * 0.45})`;
				ctx.shadowColor = `rgba(255, 255, 255, ${ratio * 0.5})`;
				ctx.shadowBlur = ratio * 4;
			} else {
				ctx.fillStyle = isBeat ? beatColor : color;
				ctx.shadowColor = isBeat ? beatColor : "transparent";
				ctx.shadowBlur = isBeat ? 10 : 0;
			}

			if (variant === "lines") {
				// Lines variant: just a thin vertical line at each peak position
				if (symmetric) {
					ctx.fillRect(x, centerY - barH, 1, barH * 2);
				} else {
					ctx.fillRect(x, height - barH, 1, barH);
				}
			} else if (symmetric) {
				drawRoundedBar({
					ctx,
					x,
					y: centerY - barH,
					width: barWidth,
					height: barH * 2,
					radius,
				});
			} else {
				drawRoundedBar({
					ctx,
					x,
					y: height - barH,
					width: barWidth,
					height: barH,
					radius,
				});
			}

			// Beat marker: a bright horizontal accent that cuts across the bar at
			// the vertical center, making beat positions obvious even when zoomed out.
			if (isBeat) {
				ctx.shadowBlur = 0;
				ctx.fillStyle = "rgba(255, 255, 255, 1)";
				const tickH = variant === "beats" || variant === "lines" ? 1.5 : 1;
				const tickW = barWidth + (variant === "beats" ? 1 : 0);
				if (symmetric) {
					ctx.fillRect(x - 0.5, centerY - tickH / 2, tickW, tickH);
				} else {
					ctx.fillRect(x - 0.5, height - barH, tickW, tickH);
				}
			}
		}

		ctx.shadowBlur = 0;
		// No trim props: the trim range now lives on the decoded record, so a
		// trim change repaints when its (cached) decode lands rather than
		// repainting against the previous window's mapping.
	}, [beatColor, color, symmetric, variant, scale]);

	// Keep a stable reference to the latest draw fn so the decode effect can
	// trigger a redraw without re-running when only styling / trim changes.
	const drawVisibleRef = useRef(drawVisible);
	drawVisibleRef.current = drawVisible;

	// Decode (or read directly) the audio source, then redraw once. The trim
	// range is a dependency because it selects both the decode window and the
	// cache key, so a trim edit resolves to (at worst) a windowed re-decode
	// instead of re-reading the whole source.
	useEffect(() => {
		let cancelled = false;

		if (audioBuffer) {
			// Caller-supplied buffer: peaks are cached on the buffer's identity,
			// so a remount (culling) no longer re-walks the samples.
			getCachedPeaks(audioBuffer).then((peaks) => {
				if (cancelled) return;
				decodedRef.current = {
					...peaks,
					...computeSourceTrimRatios({
						trimStartTicks,
						trimEndTicks,
						sourceDurationTicks,
					}),
				};
				drawVisibleRef.current();
			});
			return;
		}

		const plan = resolveDecodePlan({
			trimStartTicks,
			trimEndTicks,
			sourceDurationTicks,
		});
		const cacheKey = getCacheKey(audioUrl, mediaFile, plan.window);
		if (!cacheKey) return;

		decodeAndCache({ cacheKey, audioUrl, mediaFile, plan })
			.then((result) => {
				if (cancelled) return;
				decodedRef.current = result;
				drawVisibleRef.current();
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [
		audioBuffer,
		audioUrl,
		mediaFile,
		trimStartTicks,
		trimEndTicks,
		sourceDurationTicks,
	]);

	// Redraw when styling changes (drawVisible identity changes).
	useEffect(() => {
		drawVisible();
	}, [drawVisible]);

	// Redraw while scrolling the timeline (virtualized rendering). Scroll events
	// fire far faster than the display refresh, and each draw reallocates the
	// canvas + repaints — so the shared ticker coalesces them to at most one
	// redraw per frame *for the whole timeline*, with the scroll parent measured
	// once instead of once per mounted clip. Reads the latest draw fn via ref so
	// styling/trim changes never re-subscribe.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		scrollParentRef.current = findScrollParent({ element: container });
		const scrollParent = scrollParentRef.current;
		if (!scrollParent) return;

		return subscribeScrollWindow(scrollParent, (scrollWindow) => {
			publishedWindowRef.current = scrollWindow;
			drawVisibleRef.current();
			// Consumed: the next redraw measures the scroll parent for itself.
			publishedWindowRef.current = null;
		});
	}, []);

	const onResize = useCallback(
		(entry: ResizeObserverEntry) => {
			heightRef.current = entry.contentRect.height;
			drawVisible();
		},
		[drawVisible],
	);

	useResizeObserver({ ref: containerRef, onResize });

	return (
		<div ref={containerRef} className={cn("relative size-full", className)}>
			<canvas ref={canvasRef} className="absolute bottom-0" />
		</div>
	);
}

// ---------------------------------------------------------------------------
// Peak computation
// ---------------------------------------------------------------------------

/**
 * Stamps a clip's trim range onto a buffer's peaks. Split from
 * `computePeakBuffer` so the O(samples) part stays cacheable on buffer identity
 * alone, while the (free) ratios can differ per clip — several clips can share
 * one decoded AudioBuffer and still trim it differently.
 */
async function computeDecodedPeaks(
	buffer: AudioBuffer,
	ratios: { trimStartRatio: number; trimEndRatio: number },
): Promise<DecodedPeaks> {
	const peaks = await getCachedPeaks(buffer);
	return { ...peaks, ...ratios };
}

/**
 * Computes a downsampled peak buffer from an AudioBuffer.
 *
 * Yields to the event loop every `PEAK_YIELD_INTERVAL` blocks so the UI
 * stays responsive during large audio files. Without yielding, the
 * triple-nested loop (channels × blocks × samples) blocks the main
 * thread for seconds on files longer than a few minutes.
 *
 * Callers must go through `getCachedPeaks` / `decodeAndCache` so the pass runs
 * once per buffer instead of once per mount.
 */
async function computePeakBuffer(buffer: AudioBuffer): Promise<AudioPeaks> {
	const channels = buffer.numberOfChannels;
	const blockCount = Math.ceil(buffer.length / PEAK_BLOCK_SIZE);
	const peakBuffer = new Float32Array(blockCount);
	let globalPeak = 0;

	// Yield every ~4096 blocks (~1M samples at PEAK_BLOCK_SIZE=256) to keep
	// each chunk under one frame (16ms) on typical hardware.
	const PEAK_YIELD_INTERVAL = 4096;

	for (let c = 0; c < channels; c++) {
		const data = buffer.getChannelData(c);
		for (let b = 0; b < blockCount; b++) {
			const start = b * PEAK_BLOCK_SIZE;
			const end = Math.min(start + PEAK_BLOCK_SIZE, buffer.length);
			let max = 0;
			for (let i = start; i < end; i++) {
				const abs = data[i] < 0 ? -data[i] : data[i];
				if (abs > max) max = abs;
			}
			peakBuffer[b] += max / channels;

			// Yield periodically so the event loop can process UI events.
			if ((b & (PEAK_YIELD_INTERVAL - 1)) === 0) {
				await yieldToEventLoop();
			}
		}
	}

	for (let b = 0; b < blockCount; b++) {
		if (peakBuffer[b] > globalPeak) globalPeak = peakBuffer[b];
	}

	return {
		peakBuffer,
		bufferLength: buffer.length,
		globalPeak: Math.max(globalPeak, 0.01),
	};
}

function extractPeakRange({
	peakBuffer,
	count,
	startSample,
	endSample,
}: {
	peakBuffer: Float32Array;
	count: number;
	startSample: number;
	endSample: number;
}): number[] {
	const rangeLength = endSample - startSample;
	if (rangeLength <= 0 || count <= 0) return new Array<number>(count).fill(0);

	const step = Math.max(1, Math.floor(rangeLength / count));
	const result = new Array<number>(count).fill(0);

	for (let i = 0; i < count; i++) {
		const start = Math.floor(startSample + i * step);
		const end = Math.floor(Math.min(start + step, endSample));
		const blockStart = Math.floor(start / PEAK_BLOCK_SIZE);
		const blockEnd = Math.ceil(end / PEAK_BLOCK_SIZE);
		let max = 0;
		for (let b = blockStart; b < blockEnd && b < peakBuffer.length; b++) {
			if (peakBuffer[b] > max) max = peakBuffer[b];
		}
		result[i] = max;
	}

	return result;
}

function drawRoundedBar({
	ctx,
	x,
	y,
	width,
	height,
	radius,
}: {
	ctx: CanvasRenderingContext2D;
	x: number;
	y: number;
	width: number;
	height: number;
	radius: number;
}) {
	if (radius <= 0 || height <= radius * 2) {
		ctx.fillRect(x, y, width, height);
		return;
	}

	ctx.beginPath();
	ctx.roundRect(x, y, width, height, radius);
	ctx.fill();
}

// Graph variant: smooth continuous line through all peaks (like a DAW display).
function drawGraphVariant({
	ctx,
	peaks,
	barStep,
	maxBarHeight,
	scale,
	symmetric,
	height,
	centerY,
	color,
	beatColor,
	logBase,
}: {
	ctx: CanvasRenderingContext2D;
	peaks: number[];
	barStep: number;
	maxBarHeight: number;
	scale: number;
	symmetric: boolean;
	height: number;
	centerY: number;
	color: string;
	beatColor: string;
	logBase: number;
	visibleWidth: number;
}) {
	if (peaks.length === 0) return;
	const safePeak = 1.0;

	// Compute y-values for each peak
	const points: { x: number; y: number; intensity: number }[] = [];
	for (let i = 0; i < peaks.length; i++) {
		const normalized = Math.min(1, peaks[i] / safePeak);
		const scaled = Math.log1p(normalized) / logBase;
		const finalAmp = normalized * scale;
		const barH = Math.max(1, scaled * maxBarHeight);
		const x = i * barStep;
		const y = symmetric ? centerY - barH : height - barH;
		points.push({ x, y, intensity: finalAmp });
	}

	// Build the smoothed polyline (top edge of the waveform)
	ctx.beginPath();
	const firstPoint = points[0];
	if (!firstPoint) return;
	ctx.moveTo(
		firstPoint.x,
		symmetric ? height - firstPoint.y + centerY : height,
	);

	for (let i = 0; i < points.length; i++) {
		const p = points[i];
		const next = points[i + 1];
		if (!next) {
			ctx.lineTo(p.x, symmetric ? centerY + (centerY - p.y) : height);
			continue;
		}
		// Smooth cubic interpolation between adjacent peaks (Catmull-Rom-ish)
		const prev = points[Math.max(0, i - 1)];
		const after = points[Math.min(points.length - 1, i + 2)];
		if (!prev || !after) {
			ctx.lineTo(p.x, p.y);
			continue;
		}
		const cpX = (p.x + next.x) / 2;
		ctx.bezierCurveTo(cpX, p.y, cpX, next.y, next.x, next.y);
	}

	// Close path to baseline for fill
	const lastPoint = points[points.length - 1];
	if (lastPoint) {
		ctx.lineTo(
			lastPoint.x,
			symmetric ? centerY + (centerY - lastPoint.y) : height,
		);
	}
	if (symmetric) {
		// Mirror the path across center
		ctx.lineTo(-1, centerY);
		ctx.lineTo(-1, centerY);
	} else {
		ctx.lineTo(0, height);
	}
	ctx.closePath();

	// Stroke the outline with a soft glow
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.shadowColor = color;
	ctx.shadowBlur = 2;
	ctx.stroke();

	// Subtle fill beneath
	ctx.fillStyle = beatColor;
	ctx.globalAlpha = 0.08;
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.shadowBlur = 0;
}

// Liquid variant: continuous smooth waveform filled with vertical gradient.
// Heavy (slow if used on every clip), but visually rich for featured clips.
function drawLiquidVariant({
	ctx,
	peaks,
	barStep,
	maxBarHeight,
	symmetric,
	height,
	centerY,
	color,
	beatColor,
	logBase,
}: {
	ctx: CanvasRenderingContext2D;
	peaks: number[];
	barStep: number;
	maxBarHeight: number;
	symmetric: boolean;
	height: number;
	centerY: number;
	color: string;
	beatColor: string;
	logBase: number;
	visibleWidth: number;
}) {
	if (peaks.length === 0) return;
	const safePeak = 1.0;

	// Compute baseline + smoothed top edge for a continuous wave
	const points: { x: number; y: number }[] = [];
	for (let i = 0; i < peaks.length; i++) {
		const normalized = Math.min(1, peaks[i] / safePeak);
		const scaled = Math.log1p(normalized) / logBase;
		const barH = Math.max(1, scaled * maxBarHeight);
		const x = i * barStep;
		const y = symmetric ? centerY - barH : height - barH;
		points.push({ x, y });
	}

	// Build smooth bezier path along the top edge
	ctx.beginPath();
	const firstPoint = points[0];
	if (!firstPoint) return;
	ctx.moveTo(
		firstPoint.x,
		symmetric ? centerY + (centerY - firstPoint.y) : height,
	);

	for (let i = 0; i < points.length - 1; i++) {
		const p = points[i];
		const next = points[i + 1];
		if (!next) break;
		const cpX = (p.x + next.x) / 2;
		ctx.bezierCurveTo(cpX, p.y, cpX, next.y, next.x, next.y);
	}

	// Build mirrored bottom edge to close the shape
	const lastPoint = points[points.length - 1];
	if (!lastPoint) return;
	if (symmetric) {
		ctx.lineTo(
			lastPoint.x,
			lastPoint.y + (lastPoint.y - centerY) * -1 + (height - centerY),
		);
		// Top edge in reverse for symmetric wave
		for (let i = points.length - 1; i > 0; i--) {
			const p = points[i];
			const prev = points[i - 1];
			if (!prev) continue;
			const cpX = (p.x + prev.x) / 2;
			const mirrorY = centerY + (centerY - p.y);
			const mirrorPrevY = centerY + (centerY - prev.y);
			ctx.bezierCurveTo(cpX, mirrorY, cpX, mirrorPrevY, prev.x, mirrorPrevY);
		}
	} else {
		ctx.lineTo(lastPoint.x, height);
	}
	ctx.closePath();

	// Vertical gradient fill from baseline up to top of wave
	const gradient = ctx.createLinearGradient(0, height, 0, 0);
	gradient.addColorStop(0, `${color}00`); // transparent at bottom
	gradient.addColorStop(1, `${beatColor}cc`); // bright at top
	ctx.fillStyle = gradient;
	ctx.fill();

	// Bright top stroke
	ctx.beginPath();
	ctx.moveTo(firstPoint.x, firstPoint.y);
	for (let i = 0; i < points.length - 1; i++) {
		const p = points[i];
		const next = points[i + 1];
		if (!next) break;
		const cpX = (p.x + next.x) / 2;
		ctx.bezierCurveTo(cpX, p.y, cpX, next.y, next.x, next.y);
	}
	ctx.strokeStyle = beatColor;
	ctx.lineWidth = 1;
	ctx.shadowColor = beatColor;
	ctx.shadowBlur = 4;
	ctx.stroke();
	ctx.shadowBlur = 0;
}
