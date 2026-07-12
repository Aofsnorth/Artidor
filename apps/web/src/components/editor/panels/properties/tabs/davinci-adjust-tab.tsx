"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { VisualElement } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { NumberField } from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/ui";

const DAVINCI_EFFECT_TYPE = "davinci-adjust";

type ParamValue = number | string;
type ParamRecord = Record<string, ParamValue>;

const DEFAULTS: ParamRecord = {
	lift_x: 0,
	lift_y: 0,
	lift_luma: 0,
	gamma_x: 0,
	gamma_y: 0,
	gamma_luma: 0,
	gain_x: 0,
	gain_y: 0,
	gain_luma: 0,
	offset_x: 0,
	offset_y: 0,
	offset_luma: 0,
	contrast: 0,
	pivot: 0.435,
	midtone_detail: 0,
	highlights: 0,
	shadows: 0,
	whites: 0,
	blacks: 0,
	saturation: 1,
	hue: 0,
	lum_mix: 1,
	chroma_mix: 1,
	temperature: 0,
	tint: 0,
	y_only: 0,
	curve_master: "",
	curve_r: "",
	curve_g: "",
	curve_b: "",
	hsl_hue: 0,
	hsl_sat: 0,
	hsl_lum: 0,
	qual_low: 0,
	qual_mid: 0.5,
	qual_high: 1,
	qual_hsl_enabled: 1,
	qual_lum_enabled: 1,
	qual_sat_enabled: 1,
	qual_range: 0.1,
	qual_high_softness: 0.1,
	qual_low_softness: 0.1,
	vig_offset: 0,
	vig_softness: 0.5,
	vig_roundness: 0,
	vig_highlight: 0,
	vig_midtone: 0,
	vig_shadow: 0,
	sharpen: 0,
	blur: 0,
	defog: 0,
	glow_size: 1,
	glow_intensity: 0,
	halation_radius: 0,
	grain_amount: 0,
	lut: "none",
	lut_intensity: 100,
};

const BUILTIN_LUTS = [
	"none",
	"Cinematic Warm",
	"Cinematic Cool",
	"Teal & Orange",
	"Bleach Bypass",
	"Faded Film",
	"Vintage Sepia",
	"Kodak 2383",
	"Kodak 2393",
	"Fuji Eterna",
	"ARRI K1S1",
	"Rec.709 to LogC",
	"LogC to Rec.709",
	"Slog3 to Rec.709",
	"Cyberpunk",
	"Noir",
	"Pastel Dream",
	"Sunset Glow",
	"Moody Blue",
	"Forest Green",
	"Desert Heat",
	"Anamorphic",
	"Filmic Contrast",
];

const DEFAULT_CURVE_POINTS = [
	{ x: 0, y: 0 },
	{ x: 64, y: 64 },
	{ x: 192, y: 192 },
	{ x: 255, y: 255 },
];

type CurvePoint = { x: number; y: number };

function parseCurve(raw: ParamValue | undefined): CurvePoint[] {
	if (typeof raw !== "string" || !raw) return [...DEFAULT_CURVE_POINTS];
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed) && parsed.every((p) => "x" in p && "y" in p)) {
			return parsed as CurvePoint[];
		}
	} catch {}
	return [...DEFAULT_CURVE_POINTS];
}

function num(value: ParamValue | undefined, fallback: number): number {
	if (typeof value === "number") return value;
	const parsed = typeof value === "string" ? Number.parseFloat(value) : NaN;
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function DavinciAdjustTab({
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

	const get = useCallback(
		(key: keyof typeof DEFAULTS): ParamValue =>
			stored[key] ?? DEFAULTS[key] ?? 0,
		[stored],
	);

	const setParams = useCallback(
		(patch: ParamRecord) => {
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
		},
		[editor, effect, effects, element.id, stored, trackId],
	);

	const setNum = useCallback(
		(key: string, value: number) => setParams({ [key]: value }),
		[setParams],
	);

	return (
		<div className="flex flex-col gap-3 px-3.5 py-3">
			<PrimaryWheelsSection element={element} get={get} setParams={setParams} />
			<PrimaryBarsSection element={element} get={get} setNum={setNum} />
			<CurvesSection element={element} get={get} setParams={setParams} />
			<HslSecondarySection element={element} get={get} setNum={setNum} />
			<QualifierSection element={element} get={get} setNum={setNum} />
			<VignetteSection element={element} get={get} setNum={setNum} />
			<SharpenBlurSection element={element} get={get} setNum={setNum} />
			<GlowGrainSection element={element} get={get} setNum={setNum} />
			<LutSection element={element} get={get} setParams={setParams} />
		</div>
	);
}

type GetFn = (key: keyof typeof DEFAULTS) => ParamValue;
type SetNumFn = (key: string, value: number) => void;
type SetParamsFn = (patch: ParamRecord) => void;

function PrimaryWheelsSection({
	element,
	get,
	setParams,
}: {
	element: VisualElement;
	get: GetFn;
	setParams: SetParamsFn;
}) {
	const wheels = [
		{ id: "lift", label: "Lift" },
		{ id: "gamma", label: "Gamma" },
		{ id: "gain", label: "Gain" },
		{ id: "offset", label: "Offset" },
	] as const;
	return (
		<Section
			card
			collapsible
			defaultOpen
			sectionKey={`${element.id}:dv:wheels`}
		>
			<SectionHeader
				trailing={
					<button
						type="button"
						onClick={() => {
							setParams({
								temperature: 0,
								tint: 0,
								y_only: 0,
							});
							for (const w of wheels) {
								setParams({
									[`${w.id}_x`]: 0,
									[`${w.id}_y`]: 0,
									[`${w.id}_luma`]: 0,
								});
							}
						}}
						className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-white/55 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
					>
						Reset all
					</button>
				}
			>
				<SectionTitle>Primary Wheels</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<GlobalTempTint
					temperature={num(get("temperature"), 0)}
					tint={num(get("tint"), 0)}
					yOnly={num(get("y_only"), 0) > 0.5}
					onChange={(key, value) => setParams({ [key]: value })}
				/>
				<div className="grid grid-cols-2 gap-3">
					{wheels.map((w) => (
						<ColorWheel
							key={w.id}
							label={w.label}
							x={num(get(`${w.id}_x` as keyof typeof DEFAULTS), 0)}
							y={num(get(`${w.id}_y` as keyof typeof DEFAULTS), 0)}
							luma={num(get(`${w.id}_luma` as keyof typeof DEFAULTS), 0)}
							onChange={(x, y) =>
								setParams({ [`${w.id}_x`]: x, [`${w.id}_y`]: y })
							}
							onLumaChange={(v) => setParams({ [`${w.id}_luma`]: v })}
						/>
					))}
				</div>
			</SectionContent>
		</Section>
	);
}

/**
 * Top-of-wheels global temp/tint + Y-only toggle. Mirrors
 * DaVinci Resolve's "Temp / Tint" row + the "Y Only" master
 * that switches the wheel/bars grade between luma+chroma and
 * luma-only.
 */
function GlobalTempTint({
	temperature,
	tint,
	yOnly,
	onChange,
}: {
	temperature: number;
	tint: number;
	yOnly: boolean;
	onChange: (key: string, value: number) => void;
}) {
	return (
		<div className="mb-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-2.5">
			<div className="mb-1.5 flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<span className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/65">
						Global
					</span>
				</div>
				<button
					type="button"
					aria-pressed={yOnly}
					onClick={() => onChange("y_only", yOnly ? 0 : 1)}
					className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider transition ${
						yOnly
							? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
							: "border-white/[0.08] bg-white/[0.02] text-white/45 hover:border-white/20 hover:text-white/80"
					}`}
				>
					<span
						aria-hidden
						className="size-1.5 rounded-full"
						style={{ background: yOnly ? "#67e8f9" : "rgba(255,255,255,0.3)" }}
					/>
					Y only
				</button>
			</div>
			<div className="flex items-center gap-3">
				<TempTintSlider
					label="Temp"
					value={temperature}
					min={-100}
					max={100}
					gradient="linear-gradient(to right, #4d9aff 0%, #ffffff 50%, #ffb84d 100%)"
					hint="Cool ↔ Warm"
					onChange={(v) => onChange("temperature", v)}
					onReset={() => onChange("temperature", 0)}
				/>
				<TempTintSlider
					label="Tint"
					value={tint}
					min={-100}
					max={100}
					gradient="linear-gradient(to right, #22c55e 0%, #ffffff 50%, #ec4899 100%)"
					hint="Green ↔ Magenta"
					onChange={(v) => onChange("tint", v)}
					onReset={() => onChange("tint", 0)}
				/>
			</div>
		</div>
	);
}

function TempTintSlider({
	label,
	value,
	min,
	max,
	gradient,
	hint,
	onChange,
	onReset,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	gradient: string;
	hint: string;
	onChange: (v: number) => void;
	onReset: () => void;
}) {
	const isModified = value !== 0;
	return (
		<div className="flex flex-1 flex-col gap-1">
			<div className="flex items-center justify-between text-[0.6rem]">
				<span className="font-semibold uppercase tracking-wider text-white/65">
					{label}
				</span>
				<div className="flex items-center gap-1">
					<span
						className={`font-mono ${
							isModified ? "text-cyan-200" : "text-white/35"
						}`}
					>
						{value > 0 ? "+" : ""}
						{value.toFixed(0)}
					</span>
					{isModified && (
						<button
							type="button"
							onClick={onReset}
							className="text-[0.55rem] text-white/40 hover:text-white/80 transition"
							title={`Reset ${label}`}
						>
							↺
						</button>
					)}
				</div>
			</div>
			<div className="relative h-3">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full border border-white/10"
					style={{ background: gradient }}
				/>
				{min < 0 && (
					<div
						className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10"
						style={{
							left: `${((0 - min) / (max - min)) * 100}%`,
							right:
								value < 0
									? `${100 - ((value - min) / (max - min)) * 100}%`
									: "50%",
						}}
					/>
				)}
				<input
					type="range"
					min={min}
					max={max}
					step={1}
					value={value}
					onChange={(e) => onChange(Number.parseFloat(e.target.value))}
					aria-label={label}
					title={hint}
					className="absolute inset-0 h-3 w-full cursor-pointer appearance-none bg-transparent
						[&::-webkit-slider-thumb]:appearance-none
						[&::-webkit-slider-thumb]:size-3.5
						[&::-webkit-slider-thumb]:rounded-full
						[&::-webkit-slider-thumb]:bg-white
						[&::-webkit-slider-thumb]:shadow-[0_0_0_1.5px_rgba(0,0,0,0.55),0_0_8px_rgba(255,255,255,0.45)]
						[&::-moz-range-thumb]:size-3.5
						[&::-moz-range-thumb]:rounded-full
						[&::-moz-range-thumb]:bg-white
						[&::-moz-range-thumb]:border-0
						[&::-moz-range-thumb]:shadow-[0_0_0_1.5px_rgba(0,0,0,0.55),0_0_8px_rgba(255,255,255,0.45)]
						focus:outline-none"
				/>
			</div>
		</div>
	);
}

function ColorWheel({
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

	const radius = 100;
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
					<radialGradient id={`wheel-${label}`} cx="50%" cy="50%" r="50%">
						<stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
						<stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
					</radialGradient>
				</defs>
				<circle
					cx={120}
					cy={120}
					r={radius}
					fill={`url(#wheel-${label})`}
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

function PrimaryBarsSection({
	element,
	get,
	setNum,
}: {
	element: VisualElement;
	get: GetFn;
	setNum: SetNumFn;
}) {
	const bars: Array<{
		key: keyof typeof DEFAULTS;
		label: string;
		min: number;
		max: number;
		step: number;
		fixed: number;
	}> = [
		{
			key: "contrast",
			label: "Contrast",
			min: -1,
			max: 1,
			step: 0.01,
			fixed: 2,
		},
		{ key: "pivot", label: "Pivot", min: 0, max: 1, step: 0.001, fixed: 3 },
		{
			key: "midtone_detail",
			label: "Midtone Detail",
			min: -1,
			max: 1,
			step: 0.01,
			fixed: 2,
		},
		{
			key: "highlights",
			label: "Highlights",
			min: -1,
			max: 1,
			step: 0.01,
			fixed: 2,
		},
		{ key: "shadows", label: "Shadows", min: -1, max: 1, step: 0.01, fixed: 2 },
		{ key: "whites", label: "Whites", min: -1, max: 1, step: 0.01, fixed: 2 },
		{ key: "blacks", label: "Blacks", min: -1, max: 1, step: 0.01, fixed: 2 },
		{
			key: "saturation",
			label: "Saturation",
			min: 0,
			max: 2,
			step: 0.01,
			fixed: 2,
		},
		{ key: "hue", label: "Hue", min: -180, max: 180, step: 1, fixed: 0 },
		{ key: "lum_mix", label: "Lum Mix", min: 0, max: 1, step: 0.01, fixed: 2 },
		{
			key: "chroma_mix",
			label: "Chroma Mix",
			min: 0,
			max: 1,
			step: 0.01,
			fixed: 2,
		},
	];
	return (
		<Section card collapsible defaultOpen sectionKey={`${element.id}:dv:bars`}>
			<SectionHeader>
				<SectionTitle>Primary Bars</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					{bars.map((b) => {
						const val = num(get(b.key), DEFAULTS[b.key] as number);
						const def = DEFAULTS[b.key] as number;
						return (
							<SectionField key={b.key as string} label={b.label}>
								<NumberField
									value={val.toFixed(b.fixed)}
									scrubClamp={{ min: b.min, max: b.max }}
									onScrub={(v) => setNum(b.key as string, v)}
									onReset={() => setNum(b.key as string, def)}
									isDefault={Math.abs(val - def) < b.step / 2}
								/>
							</SectionField>
						);
					})}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function CurvesSection({
	element,
	get,
	setParams,
}: {
	element: VisualElement;
	get: GetFn;
	setParams: SetParamsFn;
}) {
	const channels = [
		{
			key: "curve_master",
			label: "Master (Y)",
			color: "rgba(255,255,255,0.9)",
		},
		{ key: "curve_r", label: "Red", color: "rgba(239,68,68,0.9)" },
		{ key: "curve_g", label: "Green", color: "rgba(34,197,94,0.9)" },
		{ key: "curve_b", label: "Blue", color: "rgba(59,130,246,0.9)" },
	] as const;
	return (
		<Section card collapsible sectionKey={`${element.id}:dv:curves`}>
			<SectionHeader>
				<SectionTitle>Curves</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex flex-col gap-3">
					{channels.map((c) => (
						<CurveEditor
							key={c.key}
							label={c.label}
							color={c.color}
							points={parseCurve(get(c.key))}
							onChange={(pts) => setParams({ [c.key]: JSON.stringify(pts) })}
							onReset={() => setParams({ [c.key]: "" })}
						/>
					))}
				</div>
			</SectionContent>
		</Section>
	);
}

function CurveEditor({
	label,
	color,
	points,
	onChange,
	onReset,
}: {
	label: string;
	color: string;
	points: CurvePoint[];
	onChange: (pts: CurvePoint[]) => void;
	onReset: () => void;
}) {
	const svgRef = useRef<SVGSVGElement>(null);
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const sorted = useMemo(() => [...points].sort((a, b) => a.x - b.x), [points]);

	const toView = (p: CurvePoint) => ({
		cx: (p.x / 255) * 240,
		cy: 240 - (p.y / 255) * 240,
	});
	const fromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
		const svg = svgRef.current;
		if (!svg) return { x: 0, y: 0 };
		const rect = svg.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 255;
		const y = 255 - ((e.clientY - rect.top) / rect.height) * 255;
		return {
			x: Math.max(0, Math.min(255, x)),
			y: Math.max(0, Math.min(255, y)),
		};
	};

	return (
		<div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2">
			<div className="flex items-center justify-between mb-1.5">
				<div className="text-[0.62rem] uppercase tracking-wider text-white/60 font-semibold">
					{label}
				</div>
				<button
					type="button"
					onClick={onReset}
					className="text-[0.6rem] text-white/40 hover:text-white/70"
				>
					Reset
				</button>
			</div>
			<svg
				ref={svgRef}
				viewBox="0 0 240 240"
				aria-label={`${label} curve`}
				className="w-full aspect-square touch-none cursor-crosshair"
				onPointerDown={(e) => {
					const { x } = fromPointer(e);
					const idx = sorted.findIndex(
						(p, i) => Math.abs(p.x - x) < 12 || i === sorted.length - 1,
					);
					if (idx !== -1) {
						setDragIndex(idx);
						e.currentTarget.setPointerCapture(e.pointerId);
					}
				}}
				onPointerMove={(e) => {
					if (dragIndex === null) return;
					const pt = fromPointer(e);
					const next = [...sorted];
					next[dragIndex] = pt;
					onChange(next);
				}}
				onPointerUp={(e) => {
					try {
						e.currentTarget.releasePointerCapture(e.pointerId);
					} catch {}
					setDragIndex(null);
				}}
			>
				<rect
					x={0}
					y={0}
					width={240}
					height={240}
					fill="rgba(0,0,0,0.2)"
					stroke="rgba(255,255,255,0.08)"
				/>
				{[60, 120, 180].map((v) => (
					<g key={v}>
						<line
							x1={v}
							y1={0}
							x2={v}
							y2={240}
							stroke="rgba(255,255,255,0.04)"
						/>
						<line
							x1={0}
							y1={v}
							x2={240}
							y2={v}
							stroke="rgba(255,255,255,0.04)"
						/>
					</g>
				))}
				<line
					x1={0}
					y1={240}
					x2={240}
					y2={0}
					stroke="rgba(255,255,255,0.12)"
					strokeDasharray="3 4"
				/>
				<polyline
					points={sorted
						.map((p) => {
							const v = toView(p);
							return `${v.cx},${v.cy}`;
						})
						.join(" ")}
					fill="none"
					stroke={color}
					strokeWidth={2}
				/>
				{sorted.map((p) => {
					const v = toView(p);
					return (
						<circle
							key={`${p.x}-${p.y}`}
							cx={v.cx}
							cy={v.cy}
							r={5}
							fill={color}
							stroke="white"
							strokeWidth={1.5}
						/>
					);
				})}
			</svg>
		</div>
	);
}

function HslSecondarySection({
	element,
	get,
	setNum,
}: {
	element: VisualElement;
	get: GetFn;
	setNum: SetNumFn;
}) {
	const sliders: Array<{
		key: keyof typeof DEFAULTS;
		label: string;
		min: number;
		max: number;
		step: number;
		fixed: number;
	}> = [
		{ key: "hsl_hue", label: "Hue", min: -180, max: 180, step: 1, fixed: 0 },
		{ key: "hsl_sat", label: "Sat", min: -1, max: 1, step: 0.01, fixed: 2 },
		{ key: "hsl_lum", label: "Lum", min: -1, max: 1, step: 0.01, fixed: 2 },
	];
	const ranges: Array<{
		key: keyof typeof DEFAULTS;
		label: string;
	}> = [
		{ key: "qual_low", label: "Low" },
		{ key: "qual_mid", label: "Mid" },
		{ key: "qual_high", label: "High" },
	];
	return (
		<Section card collapsible sectionKey={`${element.id}:dv:hsl`}>
			<SectionHeader>
				<SectionTitle>HSL Secondary</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					{sliders.map((s) => {
						const val = num(get(s.key), DEFAULTS[s.key] as number);
						const def = DEFAULTS[s.key] as number;
						return (
							<SectionField key={s.key as string} label={s.label}>
								<NumberField
									value={val.toFixed(s.fixed)}
									scrubClamp={{ min: s.min, max: s.max }}
									onScrub={(v) => setNum(s.key as string, v)}
									onReset={() => setNum(s.key as string, def)}
									isDefault={Math.abs(val - def) < s.step / 2}
								/>
							</SectionField>
						);
					})}
					<div className="mt-1 flex flex-col gap-2">
						<div className="text-[0.62rem] uppercase tracking-wider text-white/55 font-semibold">
							Qualifier Ranges
						</div>
						{ranges.map((r) => {
							const val = num(get(r.key), DEFAULTS[r.key] as number);
							return (
								<div key={r.key as string} className="flex flex-col gap-1">
									<div className="flex items-center justify-between text-[0.65rem] text-white/60">
										<span>{r.label}</span>
										<span className="font-mono">{val.toFixed(2)}</span>
									</div>
									<input
										type="range"
										min={0}
										max={1}
										step={0.01}
										value={val}
										onChange={(e) =>
											setNum(r.key as string, Number.parseFloat(e.target.value))
										}
										aria-label={`${r.label} range`}
										className="w-full accent-white/80"
									/>
								</div>
							);
						})}
					</div>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function QualifierSection({
	element,
	get,
	setNum,
}: {
	element: VisualElement;
	get: GetFn;
	setNum: SetNumFn;
}) {
	const toggles: Array<{ key: keyof typeof DEFAULTS; label: string }> = [
		{ key: "qual_hsl_enabled", label: "HSL" },
		{ key: "qual_lum_enabled", label: "Lum" },
		{ key: "qual_sat_enabled", label: "Sat" },
	];
	const sliders: Array<{
		key: keyof typeof DEFAULTS;
		label: string;
	}> = [
		{ key: "qual_range", label: "Range" },
		{ key: "qual_high_softness", label: "High Softness" },
		{ key: "qual_low_softness", label: "Low Softness" },
	];
	return (
		<Section card collapsible sectionKey={`${element.id}:dv:qualifier`}>
			<SectionHeader>
				<SectionTitle>Qualifier</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<div className="grid grid-cols-3 gap-2">
						{toggles.map((t) => {
							const checked = num(get(t.key), 1) > 0.5;
							return (
								<div
									key={t.key as string}
									className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5"
								>
									<span className="text-[0.7rem] text-white/70">{t.label}</span>
									<Switch
										checked={checked}
										onCheckedChange={(v) => setNum(t.key as string, v ? 1 : 0)}
									/>
								</div>
							);
						})}
					</div>
					{sliders.map((s) => {
						const val = num(get(s.key), DEFAULTS[s.key] as number);
						const def = DEFAULTS[s.key] as number;
						return (
							<SectionField key={s.key as string} label={s.label}>
								<NumberField
									value={val.toFixed(2)}
									scrubClamp={{ min: 0, max: 1 }}
									onScrub={(v) => setNum(s.key as string, v)}
									onReset={() => setNum(s.key as string, def)}
									isDefault={Math.abs(val - def) < 0.005}
								/>
							</SectionField>
						);
					})}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function VignetteSection({
	element,
	get,
	setNum,
}: {
	element: VisualElement;
	get: GetFn;
	setNum: SetNumFn;
}) {
	const fields: Array<{
		key: keyof typeof DEFAULTS;
		label: string;
		min: number;
		max: number;
	}> = [
		{ key: "vig_offset", label: "Offset", min: -1, max: 1 },
		{ key: "vig_softness", label: "Softness", min: 0, max: 1 },
		{ key: "vig_roundness", label: "Roundness", min: -1, max: 1 },
		{ key: "vig_highlight", label: "Highlight", min: -1, max: 1 },
		{ key: "vig_midtone", label: "Midtone", min: -1, max: 1 },
		{ key: "vig_shadow", label: "Shadow", min: -1, max: 1 },
	];
	return (
		<Section card collapsible sectionKey={`${element.id}:dv:vignette`}>
			<SectionHeader>
				<SectionTitle>Vignette</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					{fields.map((f) => {
						const val = num(get(f.key), DEFAULTS[f.key] as number);
						const def = DEFAULTS[f.key] as number;
						return (
							<SectionField key={f.key as string} label={f.label}>
								<NumberField
									value={val.toFixed(2)}
									scrubClamp={{ min: f.min, max: f.max }}
									onScrub={(v) => setNum(f.key as string, v)}
									onReset={() => setNum(f.key as string, def)}
									isDefault={Math.abs(val - def) < 0.005}
								/>
							</SectionField>
						);
					})}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function SharpenBlurSection({
	element,
	get,
	setNum,
}: {
	element: VisualElement;
	get: GetFn;
	setNum: SetNumFn;
}) {
	const fields: Array<{
		key: keyof typeof DEFAULTS;
		label: string;
		min: number;
		max: number;
	}> = [
		{ key: "sharpen", label: "Sharpen (Peaking)", min: -1, max: 5 },
		{ key: "blur", label: "Blur (Spatial)", min: 0, max: 5 },
		{ key: "defog", label: "Defog", min: 0, max: 1 },
	];
	return (
		<Section card collapsible sectionKey={`${element.id}:dv:sharpen-blur`}>
			<SectionHeader>
				<SectionTitle>Sharpening & Blur</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					{fields.map((f) => {
						const val = num(get(f.key), DEFAULTS[f.key] as number);
						const def = DEFAULTS[f.key] as number;
						return (
							<SectionField key={f.key as string} label={f.label}>
								<NumberField
									value={val.toFixed(2)}
									scrubClamp={{ min: f.min, max: f.max }}
									onScrub={(v) => setNum(f.key as string, v)}
									onReset={() => setNum(f.key as string, def)}
									isDefault={Math.abs(val - def) < 0.005}
								/>
							</SectionField>
						);
					})}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function GlowGrainSection({
	element,
	get,
	setNum,
}: {
	element: VisualElement;
	get: GetFn;
	setNum: SetNumFn;
}) {
	const fields: Array<{
		key: keyof typeof DEFAULTS;
		label: string;
		min: number;
		max: number;
	}> = [
		{ key: "glow_size", label: "Glow Size", min: 0, max: 10 },
		{ key: "glow_intensity", label: "Glow Intensity", min: 0, max: 1 },
		{ key: "halation_radius", label: "Halation Radius", min: 0, max: 5 },
		{ key: "grain_amount", label: "Grain Amount", min: 0, max: 1 },
	];
	return (
		<Section card collapsible sectionKey={`${element.id}:dv:glow-grain`}>
			<SectionHeader>
				<SectionTitle>Glow / Halation / Grain</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					{fields.map((f) => {
						const val = num(get(f.key), DEFAULTS[f.key] as number);
						const def = DEFAULTS[f.key] as number;
						return (
							<SectionField key={f.key as string} label={f.label}>
								<NumberField
									value={val.toFixed(2)}
									scrubClamp={{ min: f.min, max: f.max }}
									onScrub={(v) => setNum(f.key as string, v)}
									onReset={() => setNum(f.key as string, def)}
									isDefault={Math.abs(val - def) < 0.005}
								/>
							</SectionField>
						);
					})}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function LutSection({
	element,
	get,
	setParams,
}: {
	element: VisualElement;
	get: GetFn;
	setParams: SetParamsFn;
}) {
	const lut = String(get("lut") ?? "none");
	const intensity = num(get("lut_intensity"), 100);
	return (
		<Section card collapsible sectionKey={`${element.id}:dv:lut`}>
			<SectionHeader>
				<SectionTitle>LUTs</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<SectionField label="Preset">
						<select
							value={lut}
							onChange={(e) => setParams({ lut: e.target.value })}
							className="border-border bg-accent flex h-7 w-full items-center rounded-md border px-2 text-sm outline-none focus:border-primary"
						>
							{BUILTIN_LUTS.map((name) => (
								<option key={name} value={name}>
									{name === "none" ? "— None —" : name}
								</option>
							))}
						</select>
					</SectionField>
					<SectionField label="Intensity">
						<div className="flex items-center gap-2">
							<input
								type="range"
								min={0}
								max={100}
								step={1}
								value={intensity}
								disabled={lut === "none"}
								onChange={(e) =>
									setParams({
										lut_intensity: Number.parseFloat(e.target.value),
									})
								}
								aria-label="LUT intensity"
								className="flex-1 accent-white/80 disabled:opacity-40"
							/>
							<span className="w-10 text-right text-[0.7rem] font-mono text-white/60">
								{intensity.toFixed(0)}%
							</span>
						</div>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}
