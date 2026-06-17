"use client";

import { useState, useRef, useEffect } from "react";
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
import { NumberField } from "@/components/ui/number-field";
import { Slider } from "@/components/ui/slider";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowTurnBackwardIcon,
	FileImportIcon,
} from "@hugeicons/core-free-icons";
import { parseCubeLut } from "@/lib/colors/lut";
import { toast } from "sonner";

export function ColorGradingTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	return (
		<div className="flex flex-col">
			<HslSection element={element} trackId={trackId} />
			<CurvesSection element={element} trackId={trackId} />
			<LutSection element={element} trackId={trackId} />
		</div>
	);
}

function HslSection({
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

	const addHslEffect = () => {
		editor.timeline.addClipEffect({
			trackId,
			elementId: element.id,
			effectType: "hsl",
		});
	};

	return (
		<Section
			collapsible
			sectionKey={`${element.id}:hsl`}
			defaultOpen={!!hslEffect}
		>
			<SectionHeader
				trailing={
					!hslEffect && (
						<Button size="sm" variant="secondary" onClick={addHslEffect}>
							Add
						</Button>
					)
				}
			>
				<SectionTitle>HSL</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!hslEffect && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					<SectionField label="Master Hue">
						<Slider
							min={-180}
							max={180}
							step={1}
							value={[params.hue ?? 0]}
							onValueChange={(v) => updateParam("hue", v[0] ?? 0)}
						/>
					</SectionField>
					<SectionField label="Master Saturation">
						<Slider
							min={-100}
							max={100}
							step={1}
							value={[params.saturation ?? 0]}
							onValueChange={(v) => updateParam("saturation", v[0] ?? 0)}
						/>
					</SectionField>
					<SectionField label="Master Luminance">
						<Slider
							min={-100}
							max={100}
							step={1}
							value={[params.luminance ?? 0]}
							onValueChange={(v) => updateParam("luminance", v[0] ?? 0)}
						/>
					</SectionField>
					<div className="border-t border-border/50 my-2" />
					{HSL_COLOR_BANDS.map((band) => {
						const hueKey = `${band.id}_hue`;
						const satKey = `${band.id}_sat`;
						const lumKey = `${band.id}_lum`;
						return (
							<div key={band.id} className="space-y-1.5">
								<div className="text-xs font-medium text-muted-foreground">
									{band.name}
								</div>
								<div className="grid grid-cols-3 gap-1.5">
									<NumberField
										value={(params[hueKey] ?? 0).toString()}
										suffix="°"
										min={-180}
										max={180}
										step={1}
										onChange={(e) =>
											updateParam(
												hueKey,
												Number.parseFloat(e.target.value) || 0,
											)
										}
										onFocus={() => {}}
										onBlur={() => {}}
										onScrub={() => {}}
										onScrubEnd={() => {}}
										onReset={() => updateParam(hueKey, 0)}
									/>
									<NumberField
										value={(params[satKey] ?? 0).toString()}
										min={-100}
										max={100}
										step={1}
										onChange={(e) =>
											updateParam(
												satKey,
												Number.parseFloat(e.target.value) || 0,
											)
										}
										onFocus={() => {}}
										onBlur={() => {}}
										onScrub={() => {}}
										onScrubEnd={() => {}}
										onReset={() => updateParam(satKey, 0)}
									/>
									<NumberField
										value={(params[lumKey] ?? 0).toString()}
										min={-100}
										max={100}
										step={1}
										onChange={(e) =>
											updateParam(
												lumKey,
												Number.parseFloat(e.target.value) || 0,
											)
										}
										onFocus={() => {}}
										onBlur={() => {}}
										onScrub={() => {}}
										onScrubEnd={() => {}}
										onReset={() => updateParam(lumKey, 0)}
									/>
								</div>
							</div>
						);
					})}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function CurvesSection({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const _fileInputRef = useRef<HTMLInputElement>(null);
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

	const addCurvesEffect = () => {
		editor.timeline.addClipEffect({
			trackId,
			elementId: element.id,
			effectType: "curves",
		});
	};

	return (
		<Section
			collapsible
			sectionKey={`${element.id}:curves`}
			defaultOpen={!!curvesEffect}
		>
			<SectionHeader
				trailing={
					!curvesEffect && (
						<Button size="sm" variant="secondary" onClick={addCurvesEffect}>
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
						onChange={(p) => updateCurve("red_curve", p)}
					/>
					<CurveChannelControl
						label="Green"
						points={parseCurve(params.green_curve)}
						onChange={(p) => updateCurve("green_curve", p)}
					/>
					<CurveChannelControl
						label="Blue"
						points={parseCurve(params.blue_curve)}
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
	onChange,
}: {
	label: string;
	points: CurvePoint[];
	onChange: (points: CurvePoint[]) => void;
}) {
	const width = 200;
	const height = 120;
	const padding = 8;
	const [dragging, setDragging] = useState<number | null>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	const sorted = [...points].sort((a, b) => a.x - b.x);
	const path = sorted
		.map((p, i) => {
			const x = padding + (p.x / 255) * (width - padding * 2);
			const y = height - padding - (p.y / 255) * (height - padding * 2);
			return `${i === 0 ? "M" : "L"} ${x},${y}`;
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

	return (
		<div className="rounded-md bg-muted/30 p-2">
			<div className="text-xs font-medium text-muted-foreground mb-1">
				{label}
			</div>
			<svg
				aria-hidden="true"
				ref={svgRef}
				width={width}
				height={height}
				className="w-full cursor-crosshair"
				onPointerDown={(e) => {
					const rect = svgRef.current?.getBoundingClientRect();
					if (!rect) return;
					const localX = ((e.clientX - rect.left) / rect.width) * 255;
					const _localY = 255 - ((e.clientY - rect.top) / rect.height) * 255;
					const closest = sorted.reduce((best, p, i) => {
						const d = Math.abs(p.x - localX);
						return d < Math.abs(sorted[best].x - localX) ? i : best;
					}, 0);
					if (Math.abs(sorted[closest].x - localX) < 20) {
						handlePointerDown(e, closest);
					} else {
						handleDoubleClick(e as unknown as React.MouseEvent<SVGSVGElement>);
					}
				}}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
			>
				<rect
					x={0}
					y={0}
					width={width}
					height={height}
					fill="none"
					stroke="currentColor"
					strokeOpacity={0.2}
				/>
				<line
					x1={padding}
					y1={height - padding - (height - padding * 2) / 2}
					x2={width - padding}
					y2={height - padding - (height - padding * 2) / 2}
					stroke="currentColor"
					strokeOpacity={0.15}
					strokeDasharray="2 2"
				/>
				<line
					x1={padding + (width - padding * 2) / 2}
					y1={padding}
					x2={padding + (width - padding * 2) / 2}
					y2={height - padding}
					stroke="currentColor"
					strokeOpacity={0.15}
					strokeDasharray="2 2"
				/>
				<path d={path} fill="none" stroke="currentColor" strokeWidth={2} />
				{sorted.map((p) => {
					const x = padding + (p.x / 255) * (width - padding * 2);
					const y = height - padding - (p.y / 255) * (height - padding * 2);
					return (
						<circle
							key={`${p.x}-${p.y}`}
							cx={x}
							cy={y}
							r={4}
							fill="currentColor"
						/>
					);
				})}
			</svg>
			<div className="flex items-center gap-2 mt-1.5">
				<Button
					size="sm"
					variant="ghost"
					className="h-6 text-xs"
					onClick={() => onChange([...DEFAULT_CURVE])}
				>
					<HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-3 mr-1" />
					Reset
				</Button>
			</div>
		</div>
	);
}

function LutSection({
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
		<Section collapsible sectionKey={`${element.id}:lut`}>
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
						<HugeiconsIcon icon={FileImportIcon} className="size-3.5 mr-1.5" />
						Import .cube LUT
					</Button>
					{params.title && (
						<div className="text-xs text-muted-foreground">
							{params.title as string}
						</div>
					)}
					{lutEffect && (
						<SectionField label="Intensity">
							<Slider
								min={0}
								max={100}
								step={1}
								value={[Number(params.intensity ?? 100)]}
								onValueChange={(v) => updateIntensity(v[0] ?? 0)}
							/>
						</SectionField>
					)}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function cn(...args: Array<string | false | undefined>): string {
	return args.filter(Boolean).join(" ");
}
