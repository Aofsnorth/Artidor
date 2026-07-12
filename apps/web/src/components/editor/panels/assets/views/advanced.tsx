"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun01Icon } from "@hugeicons/core-free-icons";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useEditor } from "@/hooks/use-editor";
import { useI18n } from "@/lib/i18n";
import {
	MasterSection,
	PerBandHslSection,
	LutSection,
} from "@/components/editor/panels/properties/tabs/color-grading-tab";
import { DavinciAdjustTab } from "@/components/editor/panels/properties/tabs/davinci-adjust-tab";
import { DEFAULT_CURVE, type CurvePoint } from "@/lib/colors/curves";
import type { VisualElement } from "@/lib/timeline";
import { cn } from "@/utils/ui";
import { ScopesCard } from "./components/scopes";
import { VignetteSubTab } from "./components/vignette";
import { QualifierSubTab } from "./components/qualifier";
import { HslCurvesSubTab } from "./components/hsl-curves";

type SubTabId =
	| "wheels"
	| "hsl"
	| "qualifier"
	| "vignette"
	| "hsl-curves"
	| "curves"
	| "scopes"
	| "lut";

const SUB_TABS: Array<{ id: SubTabId; labelKey: string }> = [
	{ id: "wheels", labelKey: "advanced.wheels" },
	{ id: "hsl", labelKey: "advanced.hsl" },
	{ id: "qualifier", labelKey: "advanced.qualifier" },
	{ id: "vignette", labelKey: "advanced.vignette" },
	{ id: "hsl-curves", labelKey: "advanced.hslCurves" },
	{ id: "curves", labelKey: "advanced.curves" },
	{ id: "scopes", labelKey: "advanced.scopes" },
	{ id: "lut", labelKey: "advanced.lut" },
];

/**
 * DaVinci Resolve + Kdenlive-style colour-correction card,
 * surfaced inside the Adjust tab. Eight facets in the order a
 * colourist would walk through a grade:
 *
 *   1. Wheels     — Lift / Gamma / Gain / Offset colour wheels
 *                   + DaVinci Bars (contrast, pivot, hue, …).
 *   2. HSL        — master + 8-band HSL sliders.
 *   3. Qualifier  — HSL key with center / range / softness.
 *   4. Vignette   — shape + per-zone amount.
 *   5. HSL Curves — Hue vs Sat / Hue vs Lum / Sat vs Lum / … .
 *   6. Curves     — Master + R / G / B tone curves.
 *   7. Scopes     — live Waveform / Vectorscope / RGB Parade.
 *   8. LUT        — .cube import + intensity.
 *
 * Every facet writes to either the `davinci-adjust`, `hsl`,
 * `curves`, `hsl-curve`, or `lut` effect on the selected
 * element. Switching sub-tabs preserves the grade because all
 * facets read the same param store.
 */
export function AdvancedView({
	embedded = false,
}: {
	/**
	 * When `true`, the view skips its own `PanelView` chrome (title
	 * bar + bordered wrapper) because it's already mounted inside
	 * another card — e.g. the Adjust sub-tab. When `false` (default)
	 * the view renders the full PanelView, used when the Advanced
	 * tab is mounted at the top of the left rail.
	 */
	embedded?: boolean;
} = {}) {
	const { t } = useI18n();
	const { selectedElements } = useElementSelection();
	const editor = useEditor();
	const [activeSubTab, setActiveSubTab] = useState<SubTabId>("wheels");

	if (selectedElements.length === 0) {
		return wrapEmpty({
			embedded,
			t,
			title: t("advanced.noLayerSelected"),
			body: t("advanced.selectVideoOrImage"),
		});
	}

	if (selectedElements.length > 1) {
		return wrapEmpty({
			embedded,
			t,
			title: t("advanced.multipleLayersSelected"),
			body: t("advanced.pickOneElement", { count: selectedElements.length }),
		});
	}

	const ref = selectedElements[0];
	const track = editor.timeline.getTrackById({ trackId: ref.trackId });
	const element = track?.elements.find((e) => e.id === ref.elementId) as
		| VisualElement
		| undefined;

	if (!element || !isColorableElement(element)) {
		return wrapEmpty({
			embedded,
			t,
			title: t("advanced.pickVideoOrImage"),
			body: t("advanced.colorToolsUnsupported"),
		});
	}

	const content = (
		<>
			<div className="border-b border-white/[0.06] px-2 py-2">
				<div className="scrollbar-hidden flex gap-1 overflow-x-auto">
					{SUB_TABS.map((tab) => {
						const isActive = activeSubTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveSubTab(tab.id)}
								aria-pressed={isActive}
								className={cn(
									"shrink-0 rounded-md border px-2.5 py-1 text-[0.68rem] font-medium transition",
									isActive
										? "border-white/20 bg-white text-[#09090b] shadow-sm"
										: "border-white/[0.06] bg-white/[0.025] text-white/[0.55] hover:border-white/15 hover:bg-white/[0.08] hover:text-white",
								)}
							>
								{t(tab.labelKey)}
							</button>
						);
					})}
				</div>
			</div>

			<ScrollArea className="flex-1 scrollbar-hidden">
				<div className="flex flex-col gap-3 px-2 py-2">
					{activeSubTab === "wheels" && (
						<DavinciAdjustTab element={element} trackId={ref.trackId} />
					)}
					{activeSubTab === "hsl" && (
						<>
							<MasterSection element={element} trackId={ref.trackId} />
							<PerBandHslSection element={element} trackId={ref.trackId} />
						</>
					)}
					{activeSubTab === "qualifier" && (
						<QualifierSubTab element={element} trackId={ref.trackId} />
					)}
					{activeSubTab === "vignette" && (
						<VignetteSubTab element={element} trackId={ref.trackId} />
					)}
					{activeSubTab === "hsl-curves" && (
						<HslCurvesSubTab element={element} trackId={ref.trackId} />
					)}
					{activeSubTab === "curves" && (
						<CurvesSubTab element={element} trackId={ref.trackId} />
					)}
					{activeSubTab === "scopes" && <ScopesCard />}
					{activeSubTab === "lut" && (
						<LutSubTab element={element} trackId={ref.trackId} />
					)}
				</div>
			</ScrollArea>
		</>
	);

	return embedded ? (
		content
	) : (
		<PanelView title={t("advanced.title")}>{content}</PanelView>
	);
}

/**
 * Wrap an empty-state card. When `embedded`, render just the
 * centred text inside the parent card; otherwise wrap it in a
 * standalone PanelView so the user can still see the title.
 */
function wrapEmpty({
	embedded,
	t,
	title,
	body,
}: {
	embedded: boolean;
	t: (key: string, values?: Record<string, string | number>) => string;
	title: string;
	body: string;
}): React.ReactElement {
	const inner = (
		<EmptyState
			icon={<HugeiconsIcon icon={Sun01Icon} className="size-7 text-white/30" />}
			title={title}
			body={body}
		/>
	);
	return embedded ? (
		inner
	) : (
		<PanelView title={t("advanced.title")}>{inner}</PanelView>
	);
}

/* -------------------------------------------------------------------------- */
/*  Curves + LUT sub-tabs                                                     */
/* -------------------------------------------------------------------------- */

function CurvesSubTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const effects = element.effects ?? [];
	const curvesEffect = effects.find((e) => e.type === "curves");
	const initialParams =
		(curvesEffect?.params as Record<string, string> | undefined) ?? {};
	const [params, setParams] = useState<Record<string, string>>({
		...initialParams,
	});

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

	const { t } = useI18n();
	const channels = [
		{
			key: "rgb_curve",
			label: t("advanced.masterRgb"),
			color: "rgba(255,255,255,0.95)",
		},
		{
			key: "red_curve",
			label: t("advanced.red"),
			color: "rgba(239,68,68,0.95)",
		},
		{
			key: "green_curve",
			label: t("advanced.green"),
			color: "rgba(34,197,94,0.95)",
		},
		{
			key: "blue_curve",
			label: t("advanced.blue"),
			color: "rgba(59,130,246,0.95)",
		},
	] as const;

	return (
		<div className="flex flex-col gap-3">
			{channels.map((c) => (
				<CurveChannelControl
					key={c.key}
					label={c.label}
					color={c.color}
					points={parseCurve(params[c.key])}
					onChange={(pts) => updateCurve(c.key, pts)}
					onReset={() => updateCurve(c.key, [...DEFAULT_CURVE])}
				/>
			))}
		</div>
	);
}

function CurveChannelControl({
	label,
	color,
	points,
	onChange,
	onReset,
}: {
	label: string;
	color: string;
	points: CurvePoint[];
	onChange: (points: CurvePoint[]) => void;
	onReset: () => void;
}) {
	const { t } = useI18n();
	const width = 240;
	const height = 140;
	const padding = 8;
	const svgRef = useRef<SVGSVGElement>(null);
	const [dragging, setDragging] = useState<number | null>(null);
	const sorted = [...points].sort((a, b) => a.x - b.x);

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
		<div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2">
			<div className="mb-1.5 flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<span
						aria-hidden
						className="size-2 rounded-full ring-1 ring-white/20"
						style={{ background: color }}
					/>
					<span className="text-[0.7rem] font-semibold text-white/85">
						{label}
					</span>
				</div>
				<button
					type="button"
					onClick={onReset}
					className="text-[0.6rem] uppercase tracking-wider text-white/40 hover:text-white/80 transition"
				>
					{t("advanced.reset")}
				</button>
			</div>
			<svg
				ref={svgRef}
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				role="img"
				aria-label={t("advanced.curveEditorAria", { label })}
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
						id={`bg-${label.replace(/[^a-z0-9]/gi, "")}`}
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
					fill={`url(#bg-${label.replace(/[^a-z0-9]/gi, "")})`}
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
				<path d={path} fill="none" stroke={color} strokeWidth={2} />
				{sorted.map((p) => {
					const v = toView(p);
					return (
						<circle
							key={`${p.x}-${p.y}`}
							cx={v.cx}
							cy={v.cy}
							r={5}
							fill="white"
							stroke={color}
							strokeWidth={1.5}
						/>
					);
				})}
			</svg>
		</div>
	);
}

function LutSubTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	return <LutSection element={element} trackId={trackId} />;
}

/* -------------------------------------------------------------------------- */
/*  Shared card shell                                                         */
/* -------------------------------------------------------------------------- */

function _Section({
	title,
	hint,
	children,
}: {
	title: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border border-white/[0.08] bg-white/[0.02] shadow-inner shadow-white/[0.015]">
			<div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
				<div className="flex items-center gap-1.5">
					<span className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-white/85">
						{title}
					</span>
				</div>
				{hint && (
					<span className="text-[0.58rem] uppercase tracking-wider text-white/35">
						{hint}
					</span>
				)}
			</div>
			<div className="p-3">{children}</div>
		</div>
	);
}

function EmptyState({
	icon,
	title,
	body,
}: {
	icon: React.ReactNode;
	title: string;
	body: string;
}) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
			{icon}
			<p className="text-sm font-medium text-white/80">{title}</p>
			<p className="max-w-[260px] text-xs leading-relaxed text-white/40 text-balance">
				{body}
			</p>
		</div>
	);
}

function isColorableElement(element: VisualElement): element is VisualElement {
	return (
		element.type === "video" ||
		element.type === "image" ||
		element.type === "graphic"
	);
}
