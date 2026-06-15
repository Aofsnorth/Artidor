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
		<Section
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

					<CurvePreview curve={localCurve} />

					<div className="space-y-2">
						{localCurve.map((point, i) => (
							<div
								key={`${point.time}-${i}`}
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
											<HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
										</Button>
									</div>
								</div>
								<label className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
									Position
								</label>
								<input
									type="range"
									min={0}
									max={1}
									step={0.01}
									value={point.time}
									disabled={i === 0 || i === localCurve.length - 1}
									onChange={(e) =>
										updatePoint(i, { time: Number.parseFloat(e.target.value) })
									}
									className="mb-2 w-full"
								/>
								<label className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
									Speed
								</label>
								<input
									type="range"
									min={0.05}
									max={5}
									step={0.05}
									value={point.speed}
									onChange={(e) =>
										updatePoint(i, { speed: Number.parseFloat(e.target.value) })
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
	);
}

function CurvePreview({ curve }: { curve: SpeedCurve }) {
	const width = 280;
	const height = 80;
	const padding = 4;

	const points = useMemo(() => {
		if (curve.length === 0) return [];
		return curve.map((k) => {
			const x = padding + k.time * (width - padding * 2);
			const yMin = 0;
			const yMax = 5;
			const y =
				height -
				padding -
				((k.speed - yMin) / (yMax - yMin)) * (height - padding * 2);
			return { x, y };
		});
	}, [curve]);

	const path =
		points.length > 0
			? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`
			: "";

	return (
		<div className="rounded-md bg-muted/30 p-2">
			<svg width={width} height={height} className="w-full">
				<line
					x1={padding}
					x2={width - padding}
					y1={height - padding - ((1 - 0) / 5) * (height - padding * 2)}
					y2={height - padding - ((1 - 0) / 5) * (height - padding * 2)}
					stroke="currentColor"
					strokeOpacity="0.15"
					strokeDasharray="2 2"
				/>
				<path
					d={path}
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				{points.map((p, i) => (
					<circle key={i} cx={p.x} cy={p.y} r={4} fill="currentColor" />
				))}
			</svg>
		</div>
	);
}
