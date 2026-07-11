"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowTurnBackwardIcon } from "@hugeicons/core-free-icons";
import type { VisualElement } from "@/lib/timeline";
import { cn } from "@/utils/ui";
import { DEFAULT_CURVE, type CurvePoint } from "@/lib/colors/curves";
import { useI18n } from "@/lib/i18n";

/**
 * DaVinci-style HSL qualifier curves. Seven curve pairs:
 * Hue vs Sat, Hue vs Lum, Hue vs Hue, Sat vs Sat, Sat vs Lum,
 * Lum vs Sat, Lum vs Hue. Each curve's X axis is one
 * component; the Y axis is another. Drag points to reshape.
 *
 * Storage: every curve lives on a single `hsl-curve` effect
 * (params: `hsl_<axis>_curve` per pair). The effect is created
 * lazily on the first edit.
 */

const HSL_CURVES = [
	{
		id: "hsl_hue_sat",
		labelKey: "hslCurves.curve.hueVsSat",
		xKey: "hslCurves.axis.hue",
		yKey: "hslCurves.axis.saturation",
	},
	{
		id: "hsl_hue_lum",
		labelKey: "hslCurves.curve.hueVsLum",
		xKey: "hslCurves.axis.hue",
		yKey: "hslCurves.axis.luminance",
	},
	{
		id: "hsl_hue_hue",
		labelKey: "hslCurves.curve.hueVsHue",
		xKey: "hslCurves.axis.hueIn",
		yKey: "hslCurves.axis.hueOut",
	},
	{
		id: "hsl_sat_sat",
		labelKey: "hslCurves.curve.satVsSat",
		xKey: "hslCurves.axis.saturation",
		yKey: "hslCurves.axis.saturation",
	},
	{
		id: "hsl_sat_lum",
		labelKey: "hslCurves.curve.satVsLum",
		xKey: "hslCurves.axis.saturation",
		yKey: "hslCurves.axis.luminance",
	},
	{
		id: "hsl_lum_sat",
		labelKey: "hslCurves.curve.lumVsSat",
		xKey: "hslCurves.axis.luminance",
		yKey: "hslCurves.axis.saturation",
	},
	{
		id: "hsl_lum_hue",
		labelKey: "hslCurves.curve.lumVsHue",
		xKey: "hslCurves.axis.luminance",
		yKey: "hslCurves.axis.hue",
	},
] as const;

type HslCurveId = (typeof HSL_CURVES)[number]["id"];

export function HslCurvesSubTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const { t } = useI18n();
	const editor = useEditor();
	const effects = element.effects ?? [];
	const hslCurveEffect = effects.find((e) => e.type === "hsl-curve");
	const [activeId, setActiveId] = useState<HslCurveId>("hsl_hue_sat");

	const stored =
		(hslCurveEffect?.params as Record<string, string> | undefined) ?? {};
	const [params, setParams] = useState<Record<string, string>>({ ...stored });

	useEffect(() => {
		if (hslCurveEffect) {
			setParams({ ...(hslCurveEffect.params as Record<string, string>) });
		}
	}, [hslCurveEffect?.id, hslCurveEffect]);

	const parseCurve = (str: string | undefined): CurvePoint[] => {
		if (!str) return [...DEFAULT_CURVE];
		try {
			const parsed = JSON.parse(str);
			if (Array.isArray(parsed)) return parsed;
		} catch {}
		return [...DEFAULT_CURVE];
	};

	const updateCurve = (curveId: HslCurveId, points: CurvePoint[]) => {
		const next = { ...params, [curveId]: JSON.stringify(points) };
		setParams(next);
		const nextEffects = hslCurveEffect
			? effects.map((e) =>
					e.id === hslCurveEffect.id
						? { ...e, params: { ...e.params, [curveId]: next[curveId] } }
						: e,
				)
			: [
					...effects,
					{
						id: crypto.randomUUID(),
						type: "hsl-curve",
						params: next,
						enabled: true,
					},
				];
		editor.timeline.updateElements({
			updates: [
				{ trackId, elementId: element.id, patch: { effects: nextEffects } },
			],
		});
	};

	const active = HSL_CURVES.find((c) => c.id === activeId) ?? HSL_CURVES[0];

	return (
		<div className="flex flex-col gap-3">
			<div
				className="scrollbar-hidden flex gap-1 overflow-x-auto rounded-md border border-white/[0.08] bg-black/30 p-0.5"
				style={{
					maskImage:
						"linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)",
				}}
			>
				{HSL_CURVES.map((curve) => {
					const isActive = curve.id === activeId;
					return (
						<button
							key={curve.id}
							type="button"
							onClick={() => setActiveId(curve.id)}
							aria-pressed={isActive}
							className={cn(
								"shrink-0 rounded-md px-2.5 py-1 text-[0.66rem] font-medium transition",
								isActive
									? "bg-white text-[#09090b] shadow-sm"
									: "text-white/55 hover:bg-white/[0.08] hover:text-white",
							)}
						>
							{t(curve.labelKey)}
						</button>
					);
				})}
			</div>

			<CurveEditor
				key={active.id}
				label={t(active.labelKey)}
				xLabel={t(active.xKey)}
				yLabel={t(active.yKey)}
				points={parseCurve(params[active.id])}
				onChange={(p) => updateCurve(active.id, p)}
				onReset={() => updateCurve(active.id, [...DEFAULT_CURVE])}
			/>

			<p className="px-1 text-[0.66rem] text-white/45 leading-relaxed">
				{t("hslCurves.description")}
			</p>
		</div>
	);
}

function CurveEditor({
	label,
	xLabel,
	yLabel,
	points,
	onChange,
	onReset,
}: {
	label: string;
	xLabel: string;
	yLabel: string;
	points: CurvePoint[];
	onChange: (points: CurvePoint[]) => void;
	onReset: () => void;
}) {
	const { t } = useI18n();
	const width = 280;
	const height = 160;
	const padding = 8;
	const svgRef = useRef<SVGSVGElement>(null);
	const [dragging, setDragging] = useState<number | null>(null);
	const sorted = useMemo(() => [...points].sort((a, b) => a.x - b.x), [points]);

	const toView = (p: CurvePoint) => ({
		cx: padding + (p.x / 255) * (width - padding * 2),
		cy: height - padding - (p.y / 255) * (height - padding * 2),
	});
	const fromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return { x: 0, y: 0 };
		return {
			x: Math.max(
				0,
				Math.min(255, ((e.clientX - rect.left) / rect.width) * 255),
			),
			y: Math.max(
				0,
				Math.min(255, 255 - ((e.clientY - rect.top) / rect.height) * 255),
			),
		};
	};
	const path = sorted
		.map((p, i) => {
			const v = toView(p);
			return `${i === 0 ? "M" : "L"} ${v.cx.toFixed(2)},${v.cy.toFixed(2)}`;
		})
		.join(" ");

	return (
		<div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-2">
			<div className="mb-1.5 flex items-center justify-between">
				<div className="flex items-center gap-2 text-[0.7rem] text-white/85">
					<span className="font-semibold">{label}</span>
					<span className="text-[0.6rem] text-white/40">
						{xLabel} → {yLabel}
					</span>
				</div>
				<Button
					size="sm"
					variant="ghost"
					onClick={onReset}
					className="h-6 px-2 text-[0.6rem]"
				>
					<HugeiconsIcon icon={ArrowTurnBackwardIcon} className="mr-1 size-3" />
					{t("hslCurves.reset")}
				</Button>
			</div>
			<svg
				ref={svgRef}
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				role="img"
				aria-label={t("hslCurves.aria.curveEditor", { label })}
				className="w-full cursor-crosshair"
				onPointerDown={(e) => {
					const pt = fromPointer(e);
					const idx = sorted.findIndex(
						(p, i) => Math.abs(p.x - pt.x) < 12 || i === sorted.length - 1,
					);
					if (idx !== -1) {
						setDragging(idx);
						e.currentTarget.setPointerCapture(e.pointerId);
						const next = [...sorted];
						next[idx] = pt;
						onChange(next);
					} else {
						onChange([...sorted, pt]);
					}
				}}
				onPointerMove={(e) => {
					if (dragging === null) return;
					const pt = fromPointer(e);
					const next = [...sorted];
					next[dragging] = pt;
					onChange(next);
				}}
				onPointerUp={(e) => {
					try {
						e.currentTarget.releasePointerCapture(e.pointerId);
					} catch {}
					setDragging(null);
				}}
			>
				<defs>
					<linearGradient
						id={`hsl-bg-${label.replace(/[^a-z0-9]/gi, "")}`}
						x1="0%"
						y1="100%"
						x2="0%"
						y2="0%"
					>
						<stop offset="0%" stopColor="rgba(255,255,255,0.025)" />
						<stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
					</linearGradient>
				</defs>
				<rect
					x={0}
					y={0}
					width={width}
					height={height}
					fill={`url(#hsl-bg-${label.replace(/[^a-z0-9]/gi, "")})`}
					stroke="rgba(255,255,255,0.08)"
				/>
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
				<line
					x1={padding}
					y1={height - padding}
					x2={width - padding}
					y2={padding}
					stroke="rgba(255,255,255,0.1)"
				/>
				<path
					d={path}
					fill="none"
					stroke="rgba(255,255,255,0.95)"
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
							fill="white"
							stroke="rgba(34,211,238,0.85)"
							strokeWidth={1.5}
						/>
					);
				})}
			</svg>
		</div>
	);
}
