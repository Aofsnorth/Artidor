"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChartHistogramIcon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { samplePreviewCanvas } from "@/stores/preview-canvas-scope";
import { cn } from "@/utils/ui";

/**
 * Real-time video scopes — Waveform (luminance), Vectorscope
 * (chroma U/V), and RGB Parade (per-channel waveform). Samples
 * the live preview canvas at ~12 fps via a downsampled
 * `getImageData` and renders the result to a small canvas in
 * the inspector. Falls back to the previous frame when the
 * sampler is mid-tick so the scopes stay responsive at any
 * panel width.
 *
 * Modelled on DaVinci Resolve's scope panel — same luma ramp
 * (black at the bottom, white at the top) and the same 75 %
 * colour-bar targets in the vectorscope.
 */
export function ScopesCard() {
	const waveformRef = useRef<HTMLCanvasElement>(null);
	const vectorscopeRef = useRef<HTMLCanvasElement>(null);
	const paradeRef = useRef<HTMLCanvasElement>(null);
	const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
	const [active, setActive] = useState<"waveform" | "vectorscope" | "parade">(
		"waveform",
	);
	const [frozen, setFrozen] = useState(false);
	const frozenSnapshot = useRef<{
		pixels: Uint8ClampedArray;
		columns: number;
		rows: number;
		width: number;
		height: number;
	} | null>(null);

	// Resize-observer to keep the scope canvas sharp at the panel
	// width. CSS sizes the canvas, but we also set the internal
	// pixel buffer to match (with DPR scaling for crisp lines on
	// retina displays).
	useEffect(() => {
		const el = waveformRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			const r = entries[0]?.contentRect;
			if (!r) return;
			const dpr = window.devicePixelRatio || 1;
			setSize({
				w: Math.max(1, Math.floor(r.width * dpr)),
				h: Math.max(1, Math.floor(r.height * dpr)),
			});
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// 12 fps sampling loop. RAF would be overkill — scopes don't
	// need to update every frame, and we don't want to compete
	// with the actual preview render for the rAF slot.
	useEffect(() => {
		let raf = 0;
		let last = 0;
		const tick = (now: number) => {
			if (now - last >= 1000 / 12) {
				last = now;
				if (!frozen) {
					const sample = samplePreviewCanvas();
					if (sample) {
						frozenSnapshot.current = sample;
					}
				}
				if (frozenSnapshot.current) {
					drawScopes({
						waveformRef,
						vectorscopeRef,
						paradeRef,
						sample: frozenSnapshot.current,
					});
				}
			}
			raf = window.requestAnimationFrame(tick);
		};
		raf = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(raf);
	}, [frozen]);

	return (
		<div className="flex flex-col gap-3">
			<ScopeToolbar
				active={active}
				onActiveChange={setActive}
				frozen={frozen}
				onFreezeToggle={() => setFrozen((value) => !value)}
			/>
			<div
				className={cn(
					"relative overflow-hidden rounded-lg border border-white/[0.08] bg-[#050507]/90 shadow-inner shadow-black/40",
					"aspect-[5/3]",
				)}
			>
				<canvas
					ref={waveformRef}
					width={size.w}
					height={size.h}
					className={cn(
						"absolute inset-0 size-full transition-opacity duration-150",
						active === "waveform" ? "opacity-100" : "opacity-0",
					)}
					aria-label="Waveform scope"
				/>
				<canvas
					ref={vectorscopeRef}
					width={size.w}
					height={size.h}
					className={cn(
						"absolute inset-0 size-full transition-opacity duration-150",
						active === "vectorscope" ? "opacity-100" : "opacity-0",
					)}
					aria-label="Vectorscope"
				/>
				<canvas
					ref={paradeRef}
					width={size.w}
					height={size.h}
					className={cn(
						"absolute inset-0 size-full transition-opacity duration-150",
						active === "parade" ? "opacity-100" : "opacity-0",
					)}
					aria-label="RGB parade scope"
				/>
				<ScopeLabel active={active} />
			</div>
			<ScopeLegend active={active} />
		</div>
	);
}

function ScopeToolbar({
	active,
	onActiveChange,
	frozen,
	onFreezeToggle,
}: {
	active: "waveform" | "vectorscope" | "parade";
	onActiveChange: (next: "waveform" | "vectorscope" | "parade") => void;
	frozen: boolean;
	onFreezeToggle: () => void;
}) {
	const options: Array<{ id: typeof active; label: string }> = [
		{ id: "waveform", label: "Waveform" },
		{ id: "vectorscope", label: "Vectorscope" },
		{ id: "parade", label: "Parade" },
	];
	return (
		<div className="flex items-center gap-2">
			<div
				className="scrollbar-hidden flex flex-1 gap-1 overflow-x-auto rounded-md border border-white/[0.08] bg-black/30 p-0.5"
				style={{
					maskImage:
						"linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)",
				}}
			>
				{options.map((option) => {
					const isActive = option.id === active;
					return (
						<button
							key={option.id}
							type="button"
							onClick={() => onActiveChange(option.id)}
							aria-pressed={isActive}
							className={cn(
								"shrink-0 rounded-md px-2.5 py-1 text-[0.66rem] font-medium transition",
								isActive
									? "bg-white text-[#09090b] shadow-sm"
									: "text-white/55 hover:bg-white/[0.08] hover:text-white",
							)}
						>
							{option.label}
						</button>
					);
				})}
			</div>
			<Button
				size="sm"
				variant={frozen ? "secondary" : "ghost"}
				onClick={onFreezeToggle}
				title={frozen ? "Resume live scopes" : "Freeze current frame"}
				className="h-7 px-2"
			>
				<HugeiconsIcon icon={Refresh01Icon} className="size-3.5" />
				{frozen ? "Frozen" : "Freeze"}
			</Button>
		</div>
	);
}

function ScopeLabel({
	active,
}: {
	active: "waveform" | "vectorscope" | "parade";
}) {
	const label = {
		waveform: "Y · 0–255 luma",
		vectorscope: "U/V chroma",
		parade: "R · G · B",
	}[active];
	return (
		<div className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[0.58rem] tracking-wider text-white/55">
			{label}
		</div>
	);
}

function ScopeLegend({
	active,
}: {
	active: "waveform" | "vectorscope" | "parade";
}) {
	const items = {
		waveform: [
			{ color: "rgba(255,255,255,0.9)", label: "Luminance (Y)" },
			{
				color: "rgba(255,255,255,0.35)",
				label: "0 / 255 markers",
			},
		],
		vectorscope: [
			{ color: "rgba(96,165,250,0.95)", label: "B-Y" },
			{ color: "rgba(239,68,68,0.95)", label: "R-Y" },
			{ color: "rgba(34,197,94,0.95)", label: "G-Y" },
		],
		parade: [
			{ color: "rgba(239,68,68,0.95)", label: "Red" },
			{ color: "rgba(34,197,94,0.95)", label: "Green" },
			{ color: "rgba(96,165,250,0.95)", label: "Blue" },
		],
	}[active];
	return (
		<div className="flex flex-wrap items-center gap-3 text-[0.66rem] text-white/55">
			{items.map((item) => (
				<div key={item.label} className="flex items-center gap-1.5">
					<span
						aria-hidden
						className="size-2 shrink-0 rounded-full"
						style={{ background: item.color }}
					/>
					<span>{item.label}</span>
				</div>
			))}
			<div className="ml-auto flex items-center gap-1.5 text-white/40">
				<HugeiconsIcon icon={ChartHistogramIcon} className="size-3" />
				<span>Live · ~12 fps</span>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Rendering                                                                 */
/* -------------------------------------------------------------------------- */

function drawScopes({
	waveformRef,
	vectorscopeRef,
	paradeRef,
	sample,
}: {
	waveformRef: React.RefObject<HTMLCanvasElement | null>;
	vectorscopeRef: React.RefObject<HTMLCanvasElement | null>;
	paradeRef: React.RefObject<HTMLCanvasElement | null>;
	sample: {
		pixels: Uint8ClampedArray;
		columns: number;
		rows: number;
		width: number;
		height: number;
	};
}) {
	drawWaveform({ canvas: waveformRef.current, sample });
	drawVectorscope({ canvas: vectorscopeRef.current, sample });
	drawParade({ canvas: paradeRef.current, sample });
}

function drawWaveform({
	canvas,
	sample,
}: {
	canvas: HTMLCanvasElement | null;
	sample: { pixels: Uint8ClampedArray; columns: number; rows: number };
}) {
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const { width, height } = canvas;
	const { columns, rows, pixels } = sample;

	// Background
	ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
	ctx.fillRect(0, 0, width, height);

	// 0% / 50% / 100% graticule
	ctx.strokeStyle = "rgba(255,255,255,0.08)";
	ctx.lineWidth = 1;
	for (const t of [0, 0.5, 1]) {
		const y = Math.round(t * (height - 1));
		ctx.beginPath();
		ctx.moveTo(0, y + 0.5);
		ctx.lineTo(width, y + 0.5);
		ctx.stroke();
	}

	// Luminance histogram per column
	ctx.fillStyle = "rgba(255,255,255,0.85)";
	const colW = width / columns;
	for (let c = 0; c < columns; c++) {
		const colX = Math.floor(c * colW);
		const colWidth = Math.max(1, Math.ceil(colW) + 1);
		// For each row, find the brightest pixel at that column
		// (clipped to white at 1.0). The vertical position is the
		// brightest row's luma (0 = top = white in DaVinci's
		// convention; 255 = bottom = black).
		let maxLuma = 0;
		for (let r = 0; r < rows; r++) {
			const idx = (r * columns + c) * 4;
			const y =
				(pixels[idx] * 0.299 +
					pixels[idx + 1] * 0.587 +
					pixels[idx + 2] * 0.114) /
				255;
			if (y > maxLuma) maxLuma = y;
		}
		const barH = Math.max(1, Math.round(maxLuma * height));
		ctx.fillRect(colX, height - barH, colWidth, barH);
	}
}

function drawVectorscope({
	canvas,
	sample,
}: {
	canvas: HTMLCanvasElement | null;
	sample: { pixels: Uint8ClampedArray; columns: number; rows: number };
}) {
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const { width, height } = canvas;
	const { columns, rows, pixels } = sample;

	ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
	ctx.fillRect(0, 0, width, height);

	// Circular graticule
	const cx = width / 2;
	const cy = height / 2;
	const r = Math.min(width, height) * 0.42;
	ctx.strokeStyle = "rgba(255,255,255,0.1)";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.stroke();
	// Cross-hair
	ctx.beginPath();
	ctx.moveTo(cx - r, cy + 0.5);
	ctx.lineTo(cx + r, cy + 0.5);
	ctx.moveTo(cx + 0.5, cy - r);
	ctx.lineTo(cx + 0.5, cy + r);
	ctx.stroke();
	// 75% color-bar targets (DaVinci's graticule pattern)
	const targetColors: Array<[number, number, number]> = [
		[0.63, 0.31, 0.03], // R
		[0.31, 0.63, 0.03], // G
		[0.03, 0.31, 0.63], // B
		[0.63, 0.03, 0.31], // M
		[0.31, 0.03, 0.63], // C
		[0.63, 0.63, 0.03], // Y
	];
	for (const [bx, by] of targetColors) {
		ctx.fillStyle = `rgba(255,255,255,0.18)`;
		ctx.beginPath();
		ctx.arc(cx + bx * r, cy - by * r, 3, 0, Math.PI * 2);
		ctx.fill();
	}

	// Plot chroma per pixel (R-Y, B-Y), normalized to fit
	// inside the graticule.
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < columns; c++) {
			const idx = (r * columns + c) * 4;
			const R = pixels[idx] / 255;
			const G = pixels[idx + 1] / 255;
			const B = pixels[idx + 2] / 255;
			const Y = R * 0.299 + G * 0.587 + B * 0.114;
			const u = (B - Y) * 1.5;
			const v = (R - Y) * 1.5;
			const px = cx + u * r * 0.9;
			const py = cy - v * r * 0.9;
			ctx.fillStyle = `rgba(255,255,255,${0.08 + (1 - Math.abs(Y - 0.5)) * 0.3})`;
			ctx.fillRect(px, py, 1.5, 1.5);
		}
	}
}

function drawParade({
	canvas,
	sample,
}: {
	canvas: HTMLCanvasElement | null;
	sample: { pixels: Uint8ClampedArray; columns: number; rows: number };
}) {
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const { width, height } = canvas;
	const { columns, rows, pixels } = sample;

	ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
	ctx.fillRect(0, 0, width, height);

	const cols = 3; // R, G, B
	const colW = width / cols;
	const channelOffsets = [
		{ color: "rgba(239,68,68,0.92)", channel: 0 },
		{ color: "rgba(34,197,94,0.92)", channel: 1 },
		{ color: "rgba(96,165,250,0.92)", channel: 2 },
	];

	for (let ch = 0; ch < cols; ch++) {
		const colX = Math.floor(ch * colW);
		const colWidth = Math.ceil(colW);
		const { color, channel } = channelOffsets[ch];

		// Per-column "max-in-column" trace (like DaVinci's parade)
		ctx.fillStyle = color;
		for (let c = 0; c < columns; c++) {
			let maxV = 0;
			for (let r = 0; r < rows; r++) {
				const idx = (r * columns + c) * 4;
				const v = pixels[idx + channel] / 255;
				if (v > maxV) maxV = v;
			}
			const barH = Math.max(1, Math.round(maxV * height));
			ctx.fillRect(
				Math.floor(c * (colWidth / columns)),
				height - barH,
				Math.max(1, Math.ceil(colWidth / columns)),
				barH,
			);
		}

		// Divider between channels
		if (ch > 0) {
			ctx.strokeStyle = "rgba(255,255,255,0.08)";
			ctx.beginPath();
			ctx.moveTo(colX + 0.5, 0);
			ctx.lineTo(colX + 0.5, height);
			ctx.stroke();
		}
	}

	// 0/50/100 graticule
	ctx.strokeStyle = "rgba(255,255,255,0.08)";
	ctx.lineWidth = 1;
	for (const t of [0, 0.5, 1]) {
		const y = Math.round(t * (height - 1));
		ctx.beginPath();
		ctx.moveTo(0, y + 0.5);
		ctx.lineTo(width, y + 0.5);
		ctx.stroke();
	}
}
