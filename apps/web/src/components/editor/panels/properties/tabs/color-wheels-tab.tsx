"use client";

import { useRef, useState } from "react";
import type { VisualElement } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/utils/ui";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
} from "@/components/section";

/**
 * "Wheels" tab in the Adjust sub-tabs. Renders the same Lift / Gamma /
 * Gain / Offset colour wheels as the DaVinci Resolve-style "Manual"
 * tab, but as the only control — so colourists who want a wheel-first
 * workflow can stay on this tab without scrolling past the bars,
 * curves, HSL, qualifier, vignette, sharpen/blur, glow/grain, and
 * LUT sections.
 *
 * The wheels write to the same `davinci-adjust` effect params that the
 * "Manual" tab reads — switching between tabs preserves the colour
 * grade.
 */

type ParamValue = number | string;
type ParamRecord = Record<string, ParamValue>;

const DAVINCI_EFFECT_TYPE = "davinci-adjust";

const WHEELS = [
	{ id: "lift", label: "Lift (Shadows)" },
	{ id: "gamma", label: "Gamma (Midtones)" },
	{ id: "gain", label: "Gain (Highlights)" },
	{ id: "offset", label: "Offset" },
] as const;

const radius = 100;

export function ColorWheelsTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const effects = element.effects ?? [];
	const effect = effects.find((e) => e.type === DAVINCI_EFFECT_TYPE);
	const stored = (effect?.params as ParamRecord | undefined) ?? {};

	const get = (key: string): ParamValue => stored[key] ?? 0;
	const num = (key: string): number => {
		const v = get(key);
		return typeof v === "number"
			? v
			: Number.isFinite(Number.parseFloat(String(v)))
				? Number.parseFloat(String(v))
				: 0;
	};

	const setParams = (patch: ParamRecord) => {
		const nextParams: ParamRecord = { ...stored, ...patch };
		const nextEffects = effect
			? effects.map((e) => (e === effect ? { ...e, params: nextParams } : e))
			: [
					...effects,
					{
						id: crypto.randomUUID(),
						type: DAVINCI_EFFECT_TYPE,
						params: nextParams,
						enabled: true,
					},
				];
		editor.timeline.updateElements({
			updates: [
				{ trackId, elementId: element.id, patch: { effects: nextEffects } },
			],
		});
	};

	return (
		<div className="flex flex-col">
			<Section
				collapsible
				defaultOpen
				sectionKey={`${element.id}:color-wheels`}
			>
				<SectionHeader>
					<SectionTitle>Primary Color Wheels</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<div className="flex flex-col gap-5 items-center py-2">
						<div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
							{WHEELS.map((w) => (
								<ColorWheelControl
									key={w.id}
									label={w.label}
									x={num(`${w.id}_x`)}
									y={num(`${w.id}_y`)}
									luma={num(`${w.id}_luma`)}
									onChange={(x, y) =>
										setParams({ [`${w.id}_x`]: x, [`${w.id}_y`]: y })
									}
									onLumaChange={(v) => setParams({ [`${w.id}_luma`]: v })}
								/>
							))}
						</div>
					</div>
					<p className="mt-2 text-[0.68rem] text-white/50 text-center leading-relaxed">
						Drag the puck to bias the colour, slide below to set luma. Wheels
						write to the same DaVinci adjust effect as the Manual tab.
					</p>
				</SectionContent>
			</Section>
		</div>
	);
}

export function ColorWheelControl({
	label,
	x,
	y,
	luma,
	onChange,
	onLumaChange,
}: {
	label: string;
	x: number;
	y: number;
	luma: number;
	onChange: (x: number, y: number) => void;
	onLumaChange: (luma: number) => void;
}) {
	const svgRef = useRef<SVGSVGElement>(null);
	const [dragging, setDragging] = useState(false);

	const handleX = 120 + x * radius;
	const handleY = 120 + y * radius;
	const r = Math.round(((-x + 1) / 2) * 255);
	const g = Math.round(((x - y) / 2 + 0.5) * 255);
	const b = Math.round(((y + 1) / 2) * 255);
	const handleFill = `rgb(${r},${g},${b})`;

	const updateFromPointer = (clientX: number, clientY: number) => {
		const svg = svgRef.current;
		if (!svg) return;
		const rect = svg.getBoundingClientRect();
		const px = ((clientX - rect.left) / rect.width) * 240 - 120;
		const py = ((clientY - rect.top) / rect.height) * 240 - 120;
		const dist = Math.hypot(px, py);
		const max = radius;
		let nx = px / max;
		let ny = py / max;
		if (dist > max) {
			nx = (px / dist) * (max / max);
			ny = (py / dist) * (max / max);
		}
		onChange(Math.max(-1, Math.min(1, nx)), Math.max(-1, Math.min(1, ny)));
	};

	return (
		<div className="flex flex-col items-center gap-1.5">
			<div className="text-[0.62rem] uppercase tracking-wider text-white/60 font-semibold">
				{label}
			</div>
			<svg
				ref={svgRef}
				viewBox="0 0 240 240"
				aria-label={`${label} color wheel`}
				className={cn(
					"w-full max-w-[240px] aspect-square touch-none cursor-crosshair select-none",
					dragging && "cursor-grabbing",
				)}
				onPointerDown={(e) => {
					e.currentTarget.setPointerCapture(e.pointerId);
					setDragging(true);
					updateFromPointer(e.clientX, e.clientY);
				}}
				onPointerMove={(e) => {
					if (!dragging) return;
					updateFromPointer(e.clientX, e.clientY);
				}}
				onPointerUp={(e) => {
					try {
						e.currentTarget.releasePointerCapture(e.pointerId);
					} catch {}
					setDragging(false);
				}}
				onDoubleClick={() => onChange(0, 0)}
			>
				<defs>
					<radialGradient
						id={`wheel-${label.replace(/[^a-z0-9]/gi, "")}`}
						cx="50%"
						cy="50%"
						r="50%"
					>
						<stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
						<stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
					</radialGradient>
				</defs>
				<circle
					cx={120}
					cy={120}
					r={radius}
					fill={`url(#wheel-${label.replace(/[^a-z0-9]/gi, "")})`}
					stroke="rgba(255,255,255,0.12)"
					strokeWidth={1}
				/>
				<line
					x1={20}
					y1={120}
					x2={220}
					y2={120}
					stroke="rgba(255,255,255,0.06)"
				/>
				<line
					x1={120}
					y1={20}
					x2={120}
					y2={220}
					stroke="rgba(255,255,255,0.06)"
				/>
				<circle cx={120} cy={120} r={1.5} fill="rgba(255,255,255,0.4)" />
				<circle
					cx={handleX}
					cy={handleY}
					r={7}
					fill={handleFill}
					stroke="white"
					strokeWidth={2}
				/>
			</svg>
			<input
				type="range"
				min={-1}
				max={1}
				step={0.01}
				value={luma}
				onChange={(e) => onLumaChange(Number.parseFloat(e.target.value))}
				aria-label={`${label} luma`}
				className="w-full max-w-[240px] accent-white/80"
			/>
			<div className="text-[0.6rem] text-white/40 font-mono">
				{x.toFixed(2)} / {y.toFixed(2)} · Y {luma.toFixed(2)}
			</div>
		</div>
	);
}
