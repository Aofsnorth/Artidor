"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEditor } from "@/hooks/use-editor";
import { useElementPreview } from "@/hooks/use-element-preview";
import {
	buildSpeedRampRetime,
	getSpeedCurveFromRetime,
	SPEED_RAMP_PRESETS,
	type SpeedCurve,
} from "@/lib/retime/speed-ramp";
import type { RetimableElement, RetimeConfig } from "@/lib/timeline";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

const DEFAULT_CURVE: SpeedCurve = [
	{ time: 0, speed: 1 },
	{ time: 1, speed: 1 },
];

function clamp(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.min(Math.max(value, min), max);
}

function normalizeCurve(curve: SpeedCurve): SpeedCurve {
	const normalized = (curve.length > 0 ? curve : DEFAULT_CURVE)
		.map((point) => ({
			time: clamp(point.time, 0, 1),
			speed: clamp(point.speed, 0.05, 5),
		}))
		.sort((a, b) => a.time - b.time);

	if (normalized.length === 1) {
		return [
			{ time: 0, speed: normalized[0]?.speed ?? 1 },
			{ time: 1, speed: normalized[0]?.speed ?? 1 },
		];
	}

	return normalized.map((point, index) => {
		if (index === 0) return { ...point, time: 0 };
		if (index === normalized.length - 1) return { ...point, time: 1 };
		return point;
	});
}

export function SpeedRampTab({
	element,
	trackId,
}: {
	element: RetimableElement;
	trackId: string;
}) {
	const editor = useEditor();
	const { renderElement, commit } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});

	const retime = (renderElement as RetimableElement).retime;
	const curve = useMemo(() => getSpeedCurveFromRetime(retime), [retime]);
	const preservePitch = retime?.maintainPitch ?? true;
	const [enabled, setEnabled] = useState(curve.length > 0);
	const [localCurve, setLocalCurve] = useState<SpeedCurve>(() =>
		normalizeCurve(curve.length > 0 ? curve : DEFAULT_CURVE),
	);

	useEffect(() => {
		setEnabled(curve.length > 0);
		setLocalCurve(normalizeCurve(curve.length > 0 ? curve : DEFAULT_CURVE));
	}, [curve]);

	const updateRetime = useCallback(
		(newCurve: SpeedCurve, newEnabled: boolean) => {
			const normalizedCurve = normalizeCurve(newCurve);
			if (!newEnabled || newCurve.length === 0) {
				editor.timeline.updateElements({
					updates: [
						{ trackId, elementId: element.id, patch: { retime: undefined } },
					],
				});
				return;
			}
			const newRetime: RetimeConfig = buildSpeedRampRetime({
				keyframes: normalizedCurve,
				preservePitch,
				duration: element.duration,
			});
			editor.timeline.updateElements({
				updates: [
					{ trackId, elementId: element.id, patch: { retime: newRetime } },
				],
			});
		},
		[editor, element.duration, element.id, preservePitch, trackId],
	);

	const onToggleEnabled = (next: boolean) => {
		setEnabled(next);
		updateRetime(localCurve, next);
	};

	const applyPreset = (presetId: string) => {
		const preset = SPEED_RAMP_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		const nextCurve = normalizeCurve(preset.keyframes.map((k) => ({ ...k })));
		setLocalCurve(nextCurve);
		updateRetime(nextCurve, true);
		setEnabled(true);
	};

	const updatePoint = (
		index: number,
		partial: Partial<{ time: number; speed: number }>,
	) => {
		const nextCurve = normalizeCurve(
			localCurve.map((point, pointIndex) => {
				if (pointIndex !== index) return point;
				return { ...point, ...partial };
			}),
		);
		setLocalCurve(nextCurve);
		updateRetime(nextCurve, true);
	};

	const addPoint = () => {
		const sorted = normalizeCurve(localCurve);
		let insertTime = 0.5;
		let insertSpeed = 1;
		let largestGap = 0;

		for (let i = 0; i < sorted.length - 1; i++) {
			const current = sorted[i];
			const next = sorted[i + 1];
			if (!current || !next) continue;
			const gap = next.time - current.time;
			if (gap > largestGap) {
				largestGap = gap;
				insertTime = current.time + gap / 2;
				insertSpeed = (current.speed + next.speed) / 2;
			}
		}

		const nextCurve = normalizeCurve([
			...sorted,
			{ time: insertTime, speed: insertSpeed },
		]);
		setLocalCurve(nextCurve);
		updateRetime(nextCurve, true);
	};

	const removePoint = (index: number) => {
		if (localCurve.length <= 2) return;
		const nextCurve = normalizeCurve(localCurve.filter((_, i) => i !== index));
		setLocalCurve(nextCurve);
		updateRetime(nextCurve, true);
	};

	return (
		<div className="flex flex-col gap-3 px-3.5 py-3">
			<Section
				card
				collapsible
				sectionKey={`${element.id}:speed-ramp`}
				defaultOpen={enabled}
			>
				<SectionHeader
					trailing={
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="ghost"
								className="h-7 px-2 text-xs"
								disabled={!enabled}
								onClick={commit}
							>
								Done
							</Button>
							<Switch checked={enabled} onCheckedChange={onToggleEnabled} />
						</div>
					}
				>
					<SectionTitle>Speed Ramp</SectionTitle>
				</SectionHeader>
				<SectionContent
					className={cn(!enabled && "pointer-events-none opacity-50")}
				>
					<SectionFields>
						<SectionField label="Preset">
							<Select onValueChange={applyPreset}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Choose preset" />
								</SelectTrigger>
								<SelectContent>
									{SPEED_RAMP_PRESETS.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</SectionField>

						<CurvePreview
							curve={localCurve}
							onPointMove={(index, time, speed) => {
								updatePoint(index, { time, speed });
							}}
							onPointAdd={(time, speed) => {
								const nextCurve = normalizeCurve([
									...localCurve,
									{ time, speed },
								]);
								setLocalCurve(nextCurve);
								updateRetime(nextCurve, true);
							}}
							onPointRemove={(index) => removePoint(index)}
						/>

						<div className="space-y-2">
							{localCurve.map((point, i) => (
								<div
									key={`${point.time}-${point.speed}`}
									className="rounded-lg border border-white/10 bg-white/[0.03] p-2"
								>
									<div className="mb-2 flex items-center justify-between gap-2">
										<span className="text-xs font-medium">Point {i + 1}</span>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<span className="tabular-nums">
												{Math.round(point.time * 100)}%
											</span>
											<span className="tabular-nums text-foreground">
												{point.speed.toFixed(2)}x
											</span>
											<Button
												variant="ghost"
												size="icon"
												className="size-6"
												onClick={() => removePoint(i)}
												disabled={localCurve.length <= 2}
											>
												<HugeiconsIcon
													icon={Delete02Icon}
													className="size-3.5"
												/>
											</Button>
										</div>
									</div>
									<label
										className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground"
										htmlFor={`speed-point-${i}-position`}
									>
										Position
									</label>
									<input
										id={`speed-point-${i}-position`}
										type="range"
										min={0}
										max={1}
										step={0.01}
										value={point.time}
										disabled={i === 0 || i === localCurve.length - 1}
										onChange={(e) =>
											updatePoint(i, {
												time: Number.parseFloat(e.target.value),
											})
										}
										className="mb-2 w-full"
									/>
									<label
										className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground"
										htmlFor={`speed-point-${i}-speed`}
									>
										Speed
									</label>
									<input
										id={`speed-point-${i}-speed`}
										type="range"
										min={0.05}
										max={5}
										step={0.05}
										value={point.speed}
										onChange={(e) =>
											updatePoint(i, {
												speed: Number.parseFloat(e.target.value),
											})
										}
										className="w-full"
									/>
								</div>
							))}
						</div>

						<Button
							size="sm"
							variant="secondary"
							onClick={addPoint}
							className="w-full"
						>
							<HugeiconsIcon icon={PlusSignIcon} className="size-3.5 mr-1.5" />
							Add Keyframe
						</Button>
					</SectionFields>
				</SectionContent>
			</Section>
		</div>
	);
}

function CurvePreview({
	curve,
	onPointMove,
	onPointAdd,
	onPointRemove,
}: {
	curve: SpeedCurve;
	onPointMove?: (index: number, time: number, speed: number) => void;
	onPointAdd?: (time: number, speed: number) => void;
	onPointRemove?: (index: number) => void;
}) {
	const width = 280;
	const height = 120;
	const padding = 8;
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

	const yMin = 0;
	const yMax = 5;

	const toSvgX = useCallback(
		(time: number) => padding + time * (width - padding * 2),
		[],
	);
	const toSvgY = useCallback(
		(speed: number) =>
			height -
			padding -
			((speed - yMin) / (yMax - yMin)) * (height - padding * 2),
		[],
	);
	const fromSvgX = (x: number) =>
		clamp((x - padding) / (width - padding * 2), 0, 1);
	const fromSvgY = (y: number) =>
		clamp(
			yMin + ((height - padding - y) / (height - padding * 2)) * (yMax - yMin),
			0.05,
			5,
		);

	const points = useMemo(() => {
		if (curve.length === 0) return [];
		return curve.map((k) => ({ x: toSvgX(k.time), y: toSvgY(k.speed) }));
	}, [curve, toSvgX, toSvgY]);

	const path =
		points.length > 0
			? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`
			: "";

	const getSvgPoint = (e: React.MouseEvent | React.PointerEvent) => {
		const svg = (e.target as SVGElement).closest("svg");
		if (!svg) return { x: 0, y: 0 };
		const rect = svg.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * width;
		const y = ((e.clientY - rect.top) / rect.height) * height;
		return { x, y };
	};

	const handleBackgroundClick = (e: React.MouseEvent) => {
		if (!onPointAdd || draggingIndex !== null) return;
		const { x, y } = getSvgPoint(e);
		const time = fromSvgX(x);
		const speed = fromSvgY(y);
		onPointAdd(time, speed);
	};

	const handlePointerDown = (e: React.PointerEvent, index: number) => {
		if (!onPointMove) return;
		e.stopPropagation();
		e.preventDefault();
		setDraggingIndex(index);
		(e.target as SVGElement).setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (draggingIndex === null || !onPointMove) return;
		const { x, y } = getSvgPoint(e);
		const time = fromSvgX(x);
		const speed = fromSvgY(y);
		onPointMove(draggingIndex, time, speed);
	};

	const handlePointerUp = (e: React.PointerEvent) => {
		if (draggingIndex !== null) {
			(e.target as SVGElement).releasePointerCapture(e.pointerId);
			setDraggingIndex(null);
		}
	};

	const handleDoubleClick = (e: React.MouseEvent, index: number) => {
		e.stopPropagation();
		if (onPointRemove && curve.length > 2) {
			onPointRemove(index);
		}
	};

	return (
		<div className="rounded-md bg-muted/30 p-2">
			<svg
				aria-label="Speed curve editor"
				width={width}
				height={height}
				className="w-full cursor-crosshair select-none"
				viewBox={`0 0 ${width} ${height}`}
				onClick={handleBackgroundClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						handleBackgroundClick(
							e as unknown as React.MouseEvent<SVGSVGElement>,
						);
					}
				}}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
			>
				{/* Background grid */}
				{[0.25, 0.5, 0.75].map((t) => (
					<line
						key={`v-${t}`}
						x1={toSvgX(t)}
						x2={toSvgX(t)}
						y1={padding}
						y2={height - padding}
						stroke="currentColor"
						strokeOpacity="0.06"
						strokeDasharray="2 2"
					/>
				))}
				{[0.5, 1, 2, 3, 4].map((s) => (
					<line
						key={`h-${s}`}
						x1={padding}
						x2={width - padding}
						y1={toSvgY(s)}
						y2={toSvgY(s)}
						stroke="currentColor"
						strokeOpacity={s === 1 ? 0.2 : 0.06}
						strokeDasharray={s === 1 ? "4 2" : "2 2"}
					/>
				))}

				{/* Speed labels */}
				<text
					x={padding - 2}
					y={toSvgY(1) + 3}
					textAnchor="end"
					fontSize="7"
					fill="currentColor"
					opacity="0.4"
				>
					1x
				</text>
				<text
					x={padding - 2}
					y={toSvgY(3) + 3}
					textAnchor="end"
					fontSize="7"
					fill="currentColor"
					opacity="0.3"
				>
					3x
				</text>
				<text
					x={padding - 2}
					y={toSvgY(5) + 3}
					textAnchor="end"
					fontSize="7"
					fill="currentColor"
					opacity="0.3"
				>
					5x
				</text>

				{/* Curve path */}
				<path
					d={path}
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-white/80"
				/>

				{/* Draggable keyframe points */}
				{points.map((p, i) => {
					const isEndpoint = i === 0 || i === curve.length - 1;
					return (
						<g key={`${p.x}-${p.y}`}>
							{/* Larger hit area */}
							{/* biome-ignore lint/a11y/noStaticElementInteractions: SVG keyframe handle uses pointer events to drive drag/remove */}
							<circle
								aria-label={`Speed point ${i + 1}`}
								cx={p.x}
								cy={p.y}
								r={12}
								fill="transparent"
								className="cursor-grab active:cursor-grabbing"
								onPointerDown={(e) => handlePointerDown(e, i)}
								onDoubleClick={(e) => handleDoubleClick(e, i)}
							/>
							{/* Visible point */}
							<circle
								cx={p.x}
								cy={p.y}
								r={draggingIndex === i ? 6 : 5}
								fill={draggingIndex === i ? "#60a5fa" : "currentColor"}
								stroke={isEndpoint ? "currentColor" : "transparent"}
								strokeWidth={1.5}
								className={cn(
									"transition-[r] pointer-events-none",
									draggingIndex === i && "text-blue-400",
								)}
							/>
							{/* Speed label on drag */}
							{draggingIndex === i && (
								<text
									x={p.x}
									y={p.y - 10}
									textAnchor="middle"
									fontSize="8"
									fill="#60a5fa"
									fontWeight="bold"
								>
									{curve[i]?.speed.toFixed(2)}x
								</text>
							)}
						</g>
					);
				})}
			</svg>
			<p className="mt-1 text-center text-[0.6rem] text-muted-foreground">
				Click to add · Drag to move · Double-click to remove
			</p>
		</div>
	);
}
