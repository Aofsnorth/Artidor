"use client";

import { useCallback, useEffect, useRef } from "react";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import {
	createAudioContext,
	decodeMediaFileAudioBuffer,
} from "@/lib/media/audio";
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
	variant?: "waveform" | "beats" | "lines" | "liquid" | "graph";
	className?: string;
	trimStartTicks?: number;
	trimEndTicks?: number;
	sourceDurationTicks?: number;
	scale?: number;
}

// ---------------------------------------------------------------------------
// Shared decode cache – keyed by File identity (or URL string).
// Multiple AudioWaveform instances pointing at the same underlying File share
// one decode, eliminating duplicate WASM work and lag. We only keep the
// downsampled peak buffer (not the full AudioBuffer) so memory stays small.
// ---------------------------------------------------------------------------
export interface DecodedPeaks {
	peakBuffer: Float32Array;
	bufferLength: number;
	globalPeak: number;
}

const DECODE_CACHE = new Map<string, Promise<DecodedPeaks>>();

export function getCacheKey(audioUrl?: string, mediaFile?: File): string {
	if (mediaFile) {
		return `file:${mediaFile.name}:${mediaFile.size}:${mediaFile.lastModified}`;
	}
	if (audioUrl) return `url:${audioUrl}`;
	return "";
}

export async function decodeAndCache(
	cacheKey: string,
	audioUrl: string | undefined,
	mediaFile: File | undefined,
): Promise<DecodedPeaks> {
	const cached = DECODE_CACHE.get(cacheKey);
	if (cached) return cached;

	const promise = (async (): Promise<DecodedPeaks> => {
		const audioContext = createAudioContext();
		try {
			let buffer: AudioBuffer | null = null;

			// 1. Native decode for pure audio URLs (not video files).
			if (audioUrl && !mediaFile?.type.startsWith("video/")) {
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

			return computePeakBuffer(buffer);
		} finally {
			audioContext.close().catch(() => {});
		}
	})();

	DECODE_CACHE.set(cacheKey, promise);
	promise.catch(() => DECODE_CACHE.delete(cacheKey));
	return promise;
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
	const heightRef = useRef<number>(0);

	const drawVisible = useCallback(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		const decoded = decodedRef.current;
		const height = heightRef.current;

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
			const parentRect = scrollParent.getBoundingClientRect();
			clipLeft = Math.max(0, parentRect.left - containerRect.left);
			clipRight = Math.min(elementWidth, parentRect.right - containerRect.left);
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
		// of the source, so we offset into the buffer accordingly before applying
		// the visible-window fractions.
		const duration =
			sourceDurationTicks && sourceDurationTicks > 0 ? sourceDurationTicks : 0;
		const trimStartRatio =
			duration > 0 && trimStartTicks
				? Math.min(1, Math.max(0, trimStartTicks / duration))
				: 0;
		const trimEndRatio =
			duration > 0 && trimEndTicks
				? Math.min(1, Math.max(0, trimEndTicks / duration))
				: 0;
		const sourceStart = trimStartRatio * decoded.bufferLength;
		const sourceEnd =
			decoded.bufferLength - trimEndRatio * decoded.bufferLength;
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
	}, [
		beatColor,
		color,
		symmetric,
		variant,
		trimStartTicks,
		trimEndTicks,
		sourceDurationTicks,
		scale,
	]);

	// Keep a stable reference to the latest draw fn so the decode effect can
	// trigger a redraw without re-running when only styling / trim changes.
	const drawVisibleRef = useRef(drawVisible);
	drawVisibleRef.current = drawVisible;

	// Decode (or read directly) the audio source, then redraw once.
	useEffect(() => {
		let cancelled = false;

		if (audioBuffer) {
			decodedRef.current = computePeakBuffer(audioBuffer);
			drawVisibleRef.current();
			return;
		}

		const cacheKey = getCacheKey(audioUrl, mediaFile);
		if (!cacheKey) return;

		decodeAndCache(cacheKey, audioUrl, mediaFile)
			.then((result) => {
				if (cancelled) return;
				decodedRef.current = result;
				drawVisibleRef.current();
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [audioBuffer, audioUrl, mediaFile]);

	// Redraw when styling / trim changes (drawVisible identity changes).
	useEffect(() => {
		drawVisible();
	}, [drawVisible]);

	// Redraw while scrolling the timeline (virtualized rendering). Scroll events
	// fire far faster than the display refresh, and each draw reallocates the
	// canvas + repaints — so coalesce to at most one redraw per frame. With many
	// audio/video clips mounted this is the difference between smooth and janky
	// timeline scrolling. Reads the latest draw fn via ref so styling/trim
	// changes never re-attach the listener.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		scrollParentRef.current = findScrollParent({ element: container });
		const scrollParent = scrollParentRef.current;
		if (!scrollParent) return;

		let rafId: number | null = null;
		const onScroll = () => {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(() => {
				rafId = null;
				drawVisibleRef.current();
			});
		};

		scrollParent.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			scrollParent.removeEventListener("scroll", onScroll);
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
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
function computePeakBuffer(buffer: AudioBuffer): DecodedPeaks {
	const channels = buffer.numberOfChannels;
	const blockCount = Math.ceil(buffer.length / PEAK_BLOCK_SIZE);
	const peakBuffer = new Float32Array(blockCount);
	let globalPeak = 0;

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
