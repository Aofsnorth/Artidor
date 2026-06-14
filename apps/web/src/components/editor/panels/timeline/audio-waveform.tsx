"use client";

import { useCallback, useEffect, useRef } from "react";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import {
	computeGlobalMaxRms,
	createAudioContext,
	decodeMediaFileAudioBuffer,
	extractRmsRange,
} from "@/lib/media/audio";
import { findScrollParent } from "@/utils/browser";
import { cn } from "@/utils/ui";

const WAVEFORM_BAR_WIDTH = 2;
const WAVEFORM_BAR_GAP = 1;
const BEAT_BAR_WIDTH = 3;
const BEAT_BAR_GAP = 2;

interface AudioWaveformProps {
	audioUrl?: string;
	mediaFile?: File;
	audioBuffer?: AudioBuffer;
	color?: string;
	beatColor?: string;
	symmetric?: boolean;
	variant?: "waveform" | "beats";
	className?: string;
}

export function AudioWaveform({
	audioUrl,
	mediaFile,
	audioBuffer,
	color = "rgba(255, 255, 255, 0.7)",
	beatColor = "rgba(255, 255, 255, 0.95)",
	symmetric = false,
	variant = "waveform",
	className = "",
}: AudioWaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const bufferRef = useRef<AudioBuffer | null>(null);
	const globalMaxRef = useRef<number>(1);
	const scrollParentRef = useRef<HTMLElement | null>(null);
	const heightRef = useRef<number>(0);

	const drawVisible = useCallback(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		const buffer = bufferRef.current;
		const height = heightRef.current;

		if (!container || !canvas || !buffer || height <= 0) return;

		const elementWidth = container.offsetWidth;
		if (elementWidth <= 0) return;

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

		canvas.width = canvasW;
		canvas.height = canvasH;
		canvas.style.width = `${visibleWidth}px`;
		canvas.style.height = `${height}px`;
		canvas.style.left = `${clipLeft}px`;

		const barWidth = variant === "beats" ? BEAT_BAR_WIDTH : WAVEFORM_BAR_WIDTH;
		const barGap = variant === "beats" ? BEAT_BAR_GAP : WAVEFORM_BAR_GAP;
		const barStep = barWidth + barGap;
		const barCount = Math.max(1, Math.floor(visibleWidth / barStep));
		const startFraction = clipLeft / elementWidth;
		const endFraction = clipRight / elementWidth;
		const startSample = Math.floor(startFraction * buffer.length);
		const endSample = Math.min(
			buffer.length,
			Math.ceil(endFraction * buffer.length),
		);

		const peaks = extractRmsRange({
			buffer,
			count: barCount,
			startSample,
			endSample,
			globalMax: globalMaxRef.current,
		});

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvasW, canvasH);
		ctx.scale(dpr, dpr);
		if (variant === "beats") {
			ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
			ctx.fillRect(0, Math.floor(height / 2), visibleWidth, 1);
		}

		const maxBarHeight =
			variant === "beats"
				? height * 0.44
				: symmetric
					? height * 0.45
					: height * 0.7;
		const centerY = height / 2;

		for (let i = 0; i < barCount; i++) {
			const scaled = Math.log1p(peaks[i]) / Math.log1p(1);
			const leftPeak = peaks[Math.max(0, i - 1)] ?? 0;
			const rightPeak = peaks[Math.min(peaks.length - 1, i + 1)] ?? 0;
			const isBeat =
				variant === "beats" &&
				scaled > 0.32 &&
				peaks[i] >= leftPeak &&
				peaks[i] >= rightPeak;
			const barH = Math.max(variant === "beats" ? 2 : 1, scaled * maxBarHeight);
			const x = i * barStep;
			const radius = variant === "beats" ? Math.min(barWidth, 2) : 0;
			ctx.fillStyle = isBeat ? beatColor : color;
			ctx.shadowColor = isBeat ? beatColor : "transparent";
			ctx.shadowBlur = isBeat ? 10 : 0;

			if (symmetric) {
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

			// Beat marker: a bright horizontal accent line that cuts across the bar
			// at the vertical center. Combined with the white beat color and 10px
			// glow, this makes beat positions obvious even at small zoom levels.
			if (isBeat) {
				ctx.shadowBlur = 0;
				ctx.fillStyle = "rgba(255, 255, 255, 1)";
				const tickH = variant === "beats" ? 1.5 : 1;
				const tickW = barWidth + (variant === "beats" ? 1 : 0);
				if (symmetric) {
					ctx.fillRect(x - 0.5, centerY - tickH / 2, tickW, tickH);
				} else {
					ctx.fillRect(x - 0.5, height - barH, tickW, tickH);
				}
				if (isBeat) ctx.shadowBlur = 10;
			}
		}

		ctx.shadowBlur = 0;
	}, [beatColor, color, symmetric, variant]);

	useEffect(() => {
		let isCancelled = false;

		async function load() {
			let buffer = audioBuffer ?? null;
			let audioContext: AudioContext | null = null;

			if (!buffer && (audioUrl || mediaFile)) {
				try {
					audioContext = createAudioContext();

					if (audioUrl) {
						try {
							const resp = await fetch(audioUrl);
							const arrayBuffer = await resp.arrayBuffer();
							buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
						} catch (error) {
							if (!mediaFile) throw error;
						}
					}

					if (!buffer && mediaFile) {
						// Audio-only files: detect by mime type OR file extension
						// (some uploads do not set a proper audio/* mime).
						const isAudio =
							mediaFile.type.startsWith("audio/") ||
							/\.(wav|mp3|m4a|aac|ogg|oga|opus|flac)$/i.test(mediaFile.name);
						if (isAudio) {
							try {
								const arrayBuffer = await mediaFile.arrayBuffer();
								buffer = await audioContext.decodeAudioData(
									arrayBuffer.slice(0),
								);
							} catch {
								buffer = null;
							}
						}

						// Video or unknown: pull the audio track out via the unified
						// extractor (mediabunny handles the format dance).
						buffer ??= await decodeMediaFileAudioBuffer({
							file: mediaFile,
							audioContext,
						});
					}
				} catch {
					return;
				} finally {
					audioContext?.close().catch(() => undefined);
				}
			}

			if (!buffer || isCancelled) return;

			bufferRef.current = buffer;
			globalMaxRef.current = computeGlobalMaxRms({ buffer });
			drawVisible();
		}

		load();
		return () => {
			isCancelled = true;
		};
	}, [audioUrl, mediaFile, audioBuffer, drawVisible]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		scrollParentRef.current = findScrollParent({ element: container });
		const scrollParent = scrollParentRef.current;
		if (!scrollParent) return;

		scrollParent.addEventListener("scroll", drawVisible, { passive: true });
		return () => scrollParent.removeEventListener("scroll", drawVisible);
	}, [drawVisible]);

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
