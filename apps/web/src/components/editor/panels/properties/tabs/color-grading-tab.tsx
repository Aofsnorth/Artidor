"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/hooks/use-editor";
import { HSL_COLOR_BANDS } from "@/lib/colors/hsl";
import { DEFAULT_CURVE, type CurvePoint } from "@/lib/colors/curves";
import type { VisualElement } from "@/lib/timeline";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowTurnBackwardIcon,
	FileImportIcon,
	MagicWand05Icon,
	SparklesIcon,
} from "@hugeicons/core-free-icons";
import { parseCubeLut } from "@/lib/colors/lut";
import { toast } from "sonner";
import { cn } from "@/utils/ui";

/**
 * "Advanced" colour-correction tab. Bundles every per-channel
 * colour tool (master HSL, per-band HSL, RGB curves, .cube LUT
 * import, intensity) into a single, fully-fleshed-out surface so the
 * inspector doesn't need to expose a five-tab pack just for
 * adjustments. The grouping follows the same hierarchy as
 * DaVinci-style primary correction: master knobs at the top, then
 * per-band, then curves, then LUT — so a colourist with that muscle
 * memory feels at home.
 */
export function ColorGradingTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	return (
		<div className="flex flex-col">
			<MasterSection element={element} trackId={trackId} />
			<PerBandHslSection element={element} trackId={trackId} />
			<CurvesSection element={element} trackId={trackId} />
			<LutSection element={element} trackId={trackId} />
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Master HSL                                                                */
/* -------------------------------------------------------------------------- */

export function MasterSection({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const effects = (element as VisualElement).effects ?? [];
	const hslEffect = effects.find((e) => e.type === "hsl");

	const initialParams =
		(hslEffect?.params as Record<string, number> | undefined) ?? {};
	const [params, setParams] = useState<Record<string, number>>({
		...initialParams,
	});

	useEffect(() => {
		if (hslEffect) {
			setParams({ ...(hslEffect.params as Record<string, number>) });
		}
	}, [hslEffect?.id, hslEffect]);

	const updateParam = (key: string, value: number) => {
		const newParams = { ...params, [key]: value };
		setParams(newParams);
		if (hslEffect) {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: {
							effects: effects.map((e) =>
								e.id === hslEffect.id ? { ...e, params: newParams } : e,
							),
						},
					},
				],
			});
		} else {
			editor.timeline.addClipEffect({
				trackId,
				elementId: element.id,
				effectType: "hsl",
			});
		}
	};

	const resetAll = () => {
		updateParam("hue", 0);
		updateParam("saturation", 0);
		updateParam("luminance", 0);
	};

	const isModified =
		(params.hue ?? 0) !== 0 ||
		(params.saturation ?? 0) !== 0 ||
		(params.luminance ?? 0) !== 0;

	return (
		<Section
			collapsible
			sectionKey={`${element.id}:advanced:master`}
			defaultOpen
		>
			<SectionHeader
				leading={
					<div className="grid size-5 place-items-center rounded-md border border-white/[0.08] bg-white/[0.05] text-cyan-300">
						<HugeiconsIcon icon={SparklesIcon} className="size-3" />
					</div>
				}
				trailing={
					isModified && (
						<button
							type="button"
							onClick={resetAll}
							className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-white/55 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
						>
							Reset
						</button>
					)
				}
			>
				<SectionTitle>Master HSL</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!hslEffect && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<ColorSliderRow
						label="Hue"
						value={params.hue ?? 0}
						min={-180}
						max={180}
						step={1}
						unit="°"
						hueGradient
						onChange={(v) => updateParam("hue", v)}
						onReset={() => updateParam("hue", 0)}
					/>
					<ColorSliderRow
						label="Saturation"
						value={params.saturation ?? 0}
						min={-100}
						max={100}
						step={1}
						unit="%"
						gradient="linear-gradient(to right, #6b6b6b, #ff3b3b)"
						onChange={(v) => updateParam("saturation", v)}
						onReset={() => updateParam("saturation", 0)}
					/>
					<ColorSliderRow
						label="Luminance"
						value={params.luminance ?? 0}
						min={-100}
						max={100}
						step={1}
						unit="%"
						gradient="linear-gradient(to right, #000, #fff)"
						onChange={(v) => updateParam("luminance", v)}
						onReset={() => updateParam("luminance", 0)}
					/>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

/* -------------------------------------------------------------------------- */
/*  Per-band HSL (8 colour bands)                                             */
/* -------------------------------------------------------------------------- */

export function PerBandHslSection({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const effects = (element as VisualElement).effects ?? [];
	const hslEffect = effects.find((e) => e.type === "hsl");

	const initialParams =
		(hslEffect?.params as Record<string, number> | undefined) ?? {};
	const [params, setParams] = useState<Record<string, number>>({
		...initialParams,
	});

	useEffect(() => {
		if (hslEffect) {
			setParams({ ...(hslEffect.params as Record<string, number>) });
		}
	}, [hslEffect?.id, hslEffect]);

	const updateParam = (key: string, value: number) => {
		const newParams = { ...params, [key]: value };
		setParams(newParams);
		if (hslEffect) {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: {
							effects: effects.map((e) =>
								e.id === hslEffect.id ? { ...e, params: newParams } : e,
							),
						},
					},
				],
			});
		} else {
			editor.timeline.addClipEffect({
				trackId,
				elementId: element.id,
				effectType: "hsl",
			});
		}
	};

	return (
		<Section
			collapsible
			sectionKey={`${element.id}:advanced:bands`}
			defaultOpen
		>
			<SectionHeader
				leading={
					<div className="grid size-5 place-items-center rounded-md border border-white/[0.08] bg-white/[0.05] text-cyan-300">
						<HugeiconsIcon icon={MagicWand05Icon} className="size-3" />
					</div>
				}
			>
				<SectionTitle>Per-Band HSL</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!hslEffect && "pointer-events-none opacity-50")}
			>
				<div className="flex flex-col gap-2.5">
					{HSL_COLOR_BANDS.map((band) => {
						const hueKey = `${band.id}_hue`;
						const satKey = `${band.id}_sat`;
						const lumKey = `${band.id}_lum`;
						const bandHue = params[hueKey] ?? 0;
						const bandSat = params[satKey] ?? 0;
						const bandLum = params[lumKey] ?? 0;
						const isModified = bandHue !== 0 || bandSat !== 0 || bandLum !== 0;
						return (
							<div
								key={band.id}
								className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5"
							>
								<div className="mb-2 flex items-center justify-between">
									<div className="flex items-center gap-1.5">
										<span
											aria-hidden
											className="size-2.5 rounded-full ring-1 ring-white/15"
											style={{ background: band.color }}
										/>
										<span className="text-[0.7rem] font-semibold text-white/85">
											{band.name}
										</span>
									</div>
									{isModified && (
										<button
											type="button"
											onClick={() => {
												updateParam(hueKey, 0);
												updateParam(satKey, 0);
												updateParam(lumKey, 0);
											}}
											className="text-[0.6rem] uppercase tracking-wider text-white/40 hover:text-white/80 transition"
										>
											Reset
										</button>
									)}
								</div>
								<div className="flex flex-col gap-1.5">
									<BandSliderRow
										label="H"
										value={bandHue}
										min={-180}
										max={180}
										onChange={(v) => updateParam(hueKey, v)}
										bandColor={band.color}
									/>
									<BandSliderRow
										label="S"
										value={bandSat}
										min={-100}
										max={100}
										onChange={(v) => updateParam(satKey, v)}
									/>
									<BandSliderRow
										label="L"
										value={bandLum}
										min={-100}
										max={100}
										onChange={(v) => updateParam(lumKey, v)}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</SectionContent>
		</Section>
	);
}

/* -------------------------------------------------------------------------- */
/*  RGB Curves                                                                */
/* -------------------------------------------------------------------------- */

function CurvesSection({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const effects = (element as VisualElement).effects ?? [];
	const curvesEffect = effects.find((e) => e.type === "curves");

	const initialParams =
		(curvesEffect?.params as Record<string, string> | undefined) ?? {};
	const [params, setParams] = useState<Record<string, string>>({
		...initialParams,
	});

	useEffect(() => {
		if (curvesEffect) {
			setParams({ ...(curvesEffect.params as Record<string, string>) });
		}
	}, [curvesEffect?.id, curvesEffect]);

	const parseCurve = (str: string | undefined): CurvePoint[] => {
		if (!str) return [...DEFAULT_CURVE];
		try {
			const parsed = JSON.parse(str);
			if (Array.isArray(parsed)) return parsed;
		} catch {}
		return [...DEFAULT_CURVE];
	};

	const serializeCurve = (points: CurvePoint[]): string =>
		JSON.stringify(points);

	const updateCurve = (key: string, points: CurvePoint[]) => {
		const newParams = { ...params, [key]: serializeCurve(points) };
		setParams(newParams);
		if (curvesEffect) {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: {
							effects: effects.map((e) =>
								e.id === curvesEffect.id ? { ...e, params: newParams } : e,
							),
						},
					},
				],
			});
		} else {
			editor.timeline.addClipEffect({
				trackId,
				elementId: element.id,
				effectType: "curves",
			});
		}
	};

	return (
		<Section
			collapsible
			sectionKey={`${element.id}:advanced:curves`}
			defaultOpen={!!curvesEffect}
		>
			<SectionHeader
				trailing={
					!curvesEffect && (
						<Button
							size="sm"
							variant="secondary"
							onClick={() =>
								editor.timeline.addClipEffect({
									trackId,
									elementId: element.id,
									effectType: "curves",
								})
							}
						>
							Add
						</Button>
					)
				}
			>
				<SectionTitle>RGB Curves</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!curvesEffect && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<CurveChannelControl
						label="Master (RGB)"
						points={parseCurve(params.rgb_curve)}
						onChange={(p) => updateCurve("rgb_curve", p)}
					/>
					<CurveChannelControl
						label="Red"
						points={parseCurve(params.red_curve)}
						channelColor="rgba(239,68,68,0.9)"
						onChange={(p) => updateCurve("red_curve", p)}
					/>
					<CurveChannelControl
						label="Green"
						points={parseCurve(params.green_curve)}
						channelColor="rgba(34,197,94,0.9)"
						onChange={(p) => updateCurve("green_curve", p)}
					/>
					<CurveChannelControl
						label="Blue"
						points={parseCurve(params.blue_curve)}
						channelColor="rgba(59,130,246,0.9)"
						onChange={(p) => updateCurve("blue_curve", p)}
					/>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function CurveChannelControl({
	label,
	points,
	channelColor,
	onChange,
}: {
	label: string;
	points: CurvePoint[];
	channelColor?: string;
	onChange: (points: CurvePoint[]) => void;
}) {
	const width = 240;
	const height = 140;
	const padding = 8;
	const [dragging, setDragging] = useState<number | null>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	const sorted = useMemo(() => [...points].sort((a, b) => a.x - b.x), [points]);
	const path = sorted
		.map((p, i) => {
			const x = padding + (p.x / 255) * (width - padding * 2);
			const y = height - padding - (p.y / 255) * (height - padding * 2);
			return `${i === 0 ? "M" : "L"} ${x.toFixed(2)},${y.toFixed(2)}`;
		})
		.join(" ");

	const handlePointerDown = (
		e: React.PointerEvent<SVGSVGElement>,
		index: number,
	) => {
		e.preventDefault();
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		setDragging(index);
	};

	const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
		if (dragging === null || !svgRef.current) return;
		const rect = svgRef.current.getBoundingClientRect();
		const x = Math.max(
			0,
			Math.min(255, ((e.clientX - rect.left) / rect.width) * 255),
		);
		const y = Math.max(
			0,
			Math.min(255, 255 - ((e.clientY - rect.top) / rect.height) * 255),
		);
		const updated = [...sorted];
		updated[dragging] = { x, y };
		onChange(updated);
	};

	const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
		try {
			(e.currentTarget as Element).releasePointerCapture(e.pointerId);
		} catch {}
		setDragging(null);
	};

	const handleDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
		if (!svgRef.current) return;
		const rect = svgRef.current.getBoundingClientRect();
		const x = Math.max(
			0,
			Math.min(255, ((e.clientX - rect.left) / rect.width) * 255),
		);
		const y = Math.max(
			0,
			Math.min(255, 255 - ((e.clientY - rect.top) / rect.height) * 255),
		);
		onChange([...sorted, { x, y }]);
	};

	const stroke = channelColor ?? "rgba(255,255,255,0.92)";

	return (
		<div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2">
			<div className="mb-1.5 flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					{channelColor && (
						<span
							aria-hidden
							className="size-2 rounded-full ring-1 ring-white/20"
							style={{ background: channelColor }}
						/>
					)}
					<span className="text-[0.7rem] font-semibold text-white/85">
						{label}
					</span>
				</div>
				<button
					type="button"
					onClick={() => onChange([...DEFAULT_CURVE])}
					className="text-[0.6rem] uppercase tracking-wider text-white/40 hover:text-white/80 transition"
				>
					Reset
				</button>
			</div>
			<svg
				aria-hidden="true"
				ref={svgRef}
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				className="w-full cursor-crosshair"
				onPointerDown={(e) => {
					const rect = svgRef.current?.getBoundingClientRect();
					if (!rect) return;
					const localX = ((e.clientX - rect.left) / rect.width) * 255;
					const closest = sorted.reduce(
						(best, p, i) =>
							Math.abs(p.x - localX) < Math.abs(sorted[best].x - localX)
								? i
								: best,
						0,
					);
					if (Math.abs(sorted[closest].x - localX) < 20) {
						handlePointerDown(e, closest);
					} else {
						handleDoubleClick(e as unknown as React.MouseEvent<SVGSVGElement>);
					}
				}}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
			>
				<defs>
					<linearGradient
						id={`bg-${label.replace(/[^a-z0-9]/gi, "")}`}
						x1="0%"
						y1="100%"
						x2="0%"
						y2="0%"
					>
						<stop offset="0%" stopColor="rgba(255,255,255,0.025)" />
						<stop offset="100%" stopColor="rgba(255,255,255,0.045)" />
					</linearGradient>
				</defs>
				<rect
					x={0}
					y={0}
					width={width}
					height={height}
					fill={`url(#bg-${label.replace(/[^a-z0-9]/gi, "")})`}
					stroke="rgba(255,255,255,0.08)"
				/>
				{/* Grid */}
				{[0.25, 0.5, 0.75].map((t) => (
					<g key={t}>
						<line
							x1={padding + t * (width - padding * 2)}
							y1={padding}
							x2={padding + t * (width - padding * 2)}
							y2={height - padding}
							stroke="rgba(255,255,255,0.05)"
							strokeDasharray="2 3"
						/>
						<line
							x1={padding}
							y1={padding + t * (height - padding * 2)}
							x2={width - padding}
							y2={padding + t * (height - padding * 2)}
							stroke="rgba(255,255,255,0.05)"
							strokeDasharray="2 3"
						/>
					</g>
				))}
				{/* Diagonal reference */}
				<line
					x1={padding}
					y1={height - padding}
					x2={width - padding}
					y2={padding}
					stroke="rgba(255,255,255,0.1)"
				/>
				{/* Curve */}
				<path d={path} fill="none" stroke={stroke} strokeWidth={2} />
				{/* Control points */}
				{sorted.map((p) => {
					const x = padding + (p.x / 255) * (width - padding * 2);
					const y = height - padding - (p.y / 255) * (height - padding * 2);
					return (
						<g key={`${p.x}-${p.y}`}>
							<circle
								cx={x}
								cy={y}
								r={5}
								fill="white"
								stroke={stroke}
								strokeWidth={1.5}
							/>
						</g>
					);
				})}
			</svg>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  LUT (.cube)                                                               */
/* -------------------------------------------------------------------------- */

export function LutSection({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const effects = (element as VisualElement).effects ?? [];
	const lutEffect = effects.find((e) => e.type === "lut");
	const params =
		(lutEffect?.params as Record<string, string | number> | undefined) ?? {};

	const onImport = async (file: File) => {
		const text = await file.text();
		const lut = parseCubeLut({ content: text });
		if (!lut) {
			toast.error("Could not parse .cube LUT file");
			return;
		}
		toast.success(`LUT loaded: ${lut.title || file.name} (${lut.size}³)`);
		if (lutEffect) {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: {
							effects: effects.map((e) =>
								e.id === lutEffect.id
									? {
											...e,
											params: {
												...e.params,
												intensity: 100,
												data: JSON.stringify({
													size: lut.size,
													domainMin: lut.domainMin,
													domainMax: lut.domainMax,
													data: Array.from(lut.data),
												}),
												title: lut.title || file.name,
											},
										}
									: e,
							),
						},
					},
				],
			});
		} else {
			editor.timeline.addClipEffect({
				trackId,
				elementId: element.id,
				effectType: "lut",
			});
		}
	};

	const updateIntensity = (intensity: number) => {
		if (!lutEffect) return;
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: {
						effects: effects.map((e) =>
							e.id === lutEffect.id
								? { ...e, params: { ...e.params, intensity } }
								: e,
						),
					},
				},
			],
		});
	};

	return (
		<Section
			collapsible
			sectionKey={`${element.id}:advanced:lut`}
			defaultOpen={!!lutEffect}
		>
			<SectionHeader>
				<SectionTitle>LUT (.cube)</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<input
						ref={fileInputRef}
						type="file"
						accept=".cube"
						className="hidden"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) onImport(file);
							if (e.target) e.target.value = "";
						}}
					/>
					<Button
						size="sm"
						variant="secondary"
						className="w-full"
						onClick={() => fileInputRef.current?.click()}
					>
						<HugeiconsIcon icon={FileImportIcon} className="mr-1.5 size-3.5" />
						Import .cube LUT
					</Button>
					{params.title && (
						<div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[0.7rem] text-white/65">
							{params.title as string}
						</div>
					)}
					{lutEffect && (
						<SectionField label="Intensity">
							<ColorSliderRow
								label=""
								value={Number(params.intensity ?? 100)}
								min={0}
								max={100}
								step={1}
								unit="%"
								gradient="linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.95))"
								onChange={updateIntensity}
								onReset={() => updateIntensity(100)}
							/>
						</SectionField>
					)}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

/* -------------------------------------------------------------------------- */
/*  Reusable slider primitives                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Slider with an inline value badge + a colour-tinted track so the
 * user can see *which* parameter they're nudging at a glance. Used
 * for all the master / per-band HSL knobs in the Advanced tab.
 */
function ColorSliderRow({
	label,
	value,
	min,
	max,
	step,
	unit,
	gradient,
	hueGradient,
	onChange,
	onReset,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	unit?: string;
	/** Static CSS gradient for the track background. Mutually
	   exclusive with `hueGradient`. */
	gradient?: string;
	/** When true, render a full hue-rotation gradient (red→yellow→
	   green→cyan→blue→magenta→red) as the track. */
	hueGradient?: boolean;
	onChange: (value: number) => void;
	onReset?: () => void;
}) {
	const isModified = value !== 0 && value !== min && value !== max;
	const trackStyle = useMemo<{ background: string }>(() => {
		if (hueGradient) {
			return {
				background:
					"linear-gradient(to right, #ff3b3b 0%, #ffd23b 17%, #3bff5a 33%, #3bd2ff 50%, #6b3bff 67%, #ff3bd2 83%, #ff3b3b 100%)",
			};
		}
		return { background: gradient ?? "rgba(255,255,255,0.12)" };
	}, [hueGradient, gradient]);

	const valueText =
		unit === "°"
			? `${value > 0 ? "+" : ""}${value}°`
			: `${value > 0 ? "+" : ""}${value}${unit ?? ""}`;

	return (
		<div className="flex flex-col gap-1.5">
			{(label || onReset) && (
				<div className="flex items-center justify-between text-[0.66rem]">
					<span className="font-medium text-white/70">{label}</span>
					<div className="flex items-center gap-1.5">
						<span
							className={cn(
								"font-mono text-[0.66rem]",
								isModified ? "text-cyan-200" : "text-white/35",
							)}
						>
							{valueText}
						</span>
						{onReset && isModified && (
							<button
								type="button"
								onClick={onReset}
								className="text-white/30 transition hover:text-white/80"
								title="Reset to default"
							>
								<HugeiconsIcon
									icon={ArrowTurnBackwardIcon}
									className="size-2.5"
								/>
							</button>
						)}
					</div>
				</div>
			)}
			<SliderTrack
				value={value}
				min={min}
				max={max}
				step={step}
				trackStyle={trackStyle}
				onChange={onChange}
			/>
		</div>
	);
}

function SliderTrack({
	value,
	min,
	max,
	step,
	trackStyle,
	onChange,
}: {
	value: number;
	min: number;
	max: number;
	step: number;
	trackStyle: { background: string };
	onChange: (v: number) => void;
}) {
	const pct = ((value - min) / (max - min)) * 100;
	return (
		<div className="relative h-5 w-full">
			{/* Track background */}
			<div
				className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full border border-white/10"
				style={trackStyle}
			/>
			{/* Neutral fill on the "negative" side to communicate the
			    zero point at a glance — only rendered when min < 0. */}
			{min < 0 && (
				<div
					className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/8"
					style={{
						left: `${((0 - min) / (max - min)) * 100}%`,
						right: value < 0 ? `${100 - pct}%` : "50%",
					}}
				/>
			)}
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number.parseFloat(e.target.value))}
				aria-label="Slider"
				className="absolute inset-0 h-5 w-full cursor-pointer appearance-none bg-transparent
					[&::-webkit-slider-thumb]:appearance-none
					[&::-webkit-slider-thumb]:size-3.5
					[&::-webkit-slider-thumb]:rounded-full
					[&::-webkit-slider-thumb]:bg-white
					[&::-webkit-slider-thumb]:shadow-[0_0_0_1.5px_rgba(0,0,0,0.55),0_0_8px_rgba(255,255,255,0.45)]
					[&::-webkit-slider-thumb]:transition
					[&::-webkit-slider-thumb]:hover:scale-110
					[&::-moz-range-thumb]:size-3.5
					[&::-moz-range-thumb]:rounded-full
					[&::-moz-range-thumb]:bg-white
					[&::-moz-range-thumb]:border-0
					[&::-moz-range-thumb]:shadow-[0_0_0_1.5px_rgba(0,0,0,0.55),0_0_8px_rgba(255,255,255,0.45)]
					focus:outline-none"
			/>
		</div>
	);
}

/**
 * Compact per-band slider row. Two visual axes matter: a coloured
 * pip (so you can see which band you're on) and a tiny letter label
 * (H / S / L) so the band can fit 3 sliders into a single row
 * without screaming.
 */
function BandSliderRow({
	label,
	value,
	min,
	max,
	onChange,
	bandColor,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	onChange: (v: number) => void;
	bandColor?: string;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<span
				className={cn(
					"size-4 shrink-0 rounded text-center text-[0.58rem] font-bold leading-4 ring-1 ring-white/10",
					bandColor ? "text-white/90" : "text-white/55",
				)}
				style={bandColor ? { background: bandColor } : undefined}
			>
				{label}
			</span>
			<input
				type="range"
				min={min}
				max={max}
				step={label === "H" ? 1 : 1}
				value={value}
				onChange={(e) => onChange(Number.parseFloat(e.target.value))}
				aria-label={`${label} band slider`}
				className="h-4 flex-1 cursor-pointer appearance-none rounded-full bg-white/10
					[&::-webkit-slider-thumb]:appearance-none
					[&::-webkit-slider-thumb]:size-3
					[&::-webkit-slider-thumb]:rounded-full
					[&::-webkit-slider-thumb]:bg-white
					[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.5)]
					[&::-moz-range-thumb]:size-3
					[&::-moz-range-thumb]:rounded-full
					[&::-moz-range-thumb]:bg-white
					[&::-moz-range-thumb]:border-0
					focus:outline-none"
			/>
			<span className="w-7 shrink-0 text-right font-mono text-[0.6rem] text-white/55">
				{value > 0 ? `+${value}` : value}
			</span>
		</div>
	);
}
