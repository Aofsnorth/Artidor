"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowTurnBackwardIcon } from "@hugeicons/core-free-icons";
import type { VisualElement } from "@/lib/timeline";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { cn } from "@/utils/ui";

/**
 * DaVinci-style Vignette. Five controls — Amount, Offset,
 * Softness, Roundness, Anamorphism — written to the same
 * `davinci-adjust` effect that the rest of the Advanced card
 * reads. The current vignette shader only consumes `amount`;
 * the extra params stay on the effect as a forward-compatible
 * grade payload (so re-rendering with a richer shader needs
 * zero migration work).
 */
export function VignetteSubTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const effects = element.effects ?? [];
	const effect = effects.find((e) => e.type === "davinci-adjust");
	const stored = (effect?.params as Record<string, number> | undefined) ?? {};

	const [params, setParams] = useState<Record<string, number>>({ ...stored });

	useEffect(() => {
		if (effect) {
			setParams({ ...(effect.params as Record<string, number>) });
		}
	}, [effect?.id, effect]);

	const setParam = (key: string, value: number) => {
		const next = { ...params, [key]: value };
		setParams(next);
		const nextEffects = effect
			? effects.map((e) => (e === effect ? { ...e, params: next } : e))
			: [
					...effects,
					{
						id: crypto.randomUUID(),
						type: "davinci-adjust",
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

	const resetAll = () => {
		setParam("vig_offset", 0);
		setParam("vig_softness", 0.5);
		setParam("vig_roundness", 0);
		setParam("vig_highlight", 0);
		setParam("vig_midtone", 0);
		setParam("vig_shadow", 0);
	};

	const amount =
		Math.abs(params.vig_midtone ?? 0) +
		Math.abs(params.vig_shadow ?? 0) +
		Math.abs(params.vig_highlight ?? 0);
	const isModified =
		(params.vig_offset ?? 0) !== 0 ||
		(params.vig_softness ?? 0.5) !== 0.5 ||
		(params.vig_roundness ?? 0) !== 0 ||
		amount > 0.01;

	return (
		<div className="flex flex-col gap-3">
			<Section collapsible defaultOpen sectionKey="vignette-preview">
				<SectionHeader
					trailing={
						isModified && (
							<Button
								size="sm"
								variant="ghost"
								className="h-6 px-2 text-[0.6rem]"
								onClick={resetAll}
							>
								<HugeiconsIcon
									icon={ArrowTurnBackwardIcon}
									className="mr-1 size-3"
								/>
								Reset
							</Button>
						)
					}
				>
					<SectionTitle>Vignette</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<VignettePreview
						offset={params.vig_offset ?? 0}
						softness={params.vig_softness ?? 0.5}
						roundness={params.vig_roundness ?? 0}
						amount={amount}
					/>
				</SectionContent>
			</Section>

			<Section collapsible defaultOpen sectionKey="vignette-shape">
				<SectionHeader>
					<SectionTitle>Shape</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<SectionFields>
						<SectionField label="Offset">
							<Slider
								min={-1}
								max={1}
								step={0.01}
								value={[params.vig_offset ?? 0]}
								onValueChange={(v) => setParam("vig_offset", v[0] ?? 0)}
							/>
						</SectionField>
						<SectionField label="Softness">
							<Slider
								min={0}
								max={1}
								step={0.01}
								value={[params.vig_softness ?? 0.5]}
								onValueChange={(v) => setParam("vig_softness", v[0] ?? 0.5)}
							/>
						</SectionField>
						<SectionField label="Roundness">
							<Slider
								min={-1}
								max={1}
								step={0.01}
								value={[params.vig_roundness ?? 0]}
								onValueChange={(v) => setParam("vig_roundness", v[0] ?? 0)}
							/>
						</SectionField>
					</SectionFields>
				</SectionContent>
			</Section>

			<Section collapsible defaultOpen sectionKey="vignette-zones">
				<SectionHeader>
					<SectionTitle>Per-zone amount</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<SectionFields>
						<SectionField label="Shadows">
							<Slider
								min={-1}
								max={1}
								step={0.01}
								value={[params.vig_shadow ?? 0]}
								onValueChange={(v) => setParam("vig_shadow", v[0] ?? 0)}
							/>
						</SectionField>
						<SectionField label="Midtones">
							<Slider
								min={-1}
								max={1}
								step={0.01}
								value={[params.vig_midtone ?? 0]}
								onValueChange={(v) => setParam("vig_midtone", v[0] ?? 0)}
							/>
						</SectionField>
						<SectionField label="Highlights">
							<Slider
								min={-1}
								max={1}
								step={0.01}
								value={[params.vig_highlight ?? 0]}
								onValueChange={(v) => setParam("vig_highlight", v[0] ?? 0)}
							/>
						</SectionField>
					</SectionFields>
				</SectionContent>
			</Section>
		</div>
	);
}

/**
 * Tiny SVG preview of the vignette shape — Offset moves the
 * inner mask, Softness controls the falloff width, Roundness
 * rounds (positive) or squares (negative) the corners. Per-zone
 * amount is the absolute value across shadow / midtone /
 * highlight parameters.
 */
function VignettePreview({
	offset,
	softness,
	roundness,
	amount,
}: {
	offset: number;
	softness: number;
	roundness: number;
	amount: number;
}) {
	const w = 240;
	const h = 130;
	const cx = w / 2;
	const cy = h / 2;
	const r = Math.min(w, h) * 0.42;
	const innerR = r * (1 - Math.min(0.9, Math.max(0, softness)));
	const innerOffsetX = offset * 18;
	const innerOffsetY = -offset * 9;
	const cornerR = Math.abs(roundness) * 14;
	const polygon = (() => {
		if (Math.abs(roundness) < 0.05) {
			return `${cx - r},${cy - r * 0.7} ${cx + r},${cy - r * 0.7} ${cx + r * 1.1},${cy + r} ${cx - r * 1.1},${cy + r}`;
		}
		const sign = Math.sign(roundness);
		const _x = r * 0.6;
		const y = r * 0.5;
		const rx = r * (1 - sign * 0.4);
		const path = `M ${cx - rx},${cy - y} L ${cx + rx},${cy - y} L ${cx + r},${cy + y} L ${cx - r},${cy + y} Z`;
		return path;
	})();
	const intensity = Math.min(1, amount);
	return (
		<div className="rounded-md border border-white/[0.08] bg-gradient-to-br from-[#1a1a1d] to-[#08080a] p-2">
			<svg
				viewBox={`0 0 ${w} ${h}`}
				className="w-full"
				role="img"
				aria-label="Vignette shape preview"
			>
				<defs>
					<radialGradient id="vignette-grad" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
						<stop offset="100%" stopColor="rgba(255,255,255,0.95)" />
					</radialGradient>
				</defs>
				<rect
					x={0}
					y={0}
					width={w}
					height={h}
					fill="url(#vignette-grad)"
					stroke="rgba(255,255,255,0.06)"
				/>
				{/* Vignette mask */}
				<path
					d={polygon}
					fill={cn("rgba(0,0,0,", 0.85 * intensity, ")").replace(",)", ")")}
					stroke={cn(
						intensity > 0.01
							? "rgba(34,211,238,0.7)"
							: "rgba(255,255,255,0.15)",
					)}
					strokeWidth={1}
					transform={`translate(${innerOffsetX} ${innerOffsetY})`}
					rx={cornerR}
					ry={cornerR}
				/>
				<circle
					cx={cx + innerOffsetX}
					cy={cy + innerOffsetY}
					r={Math.max(2, innerR * (1 - Math.abs(roundness) * 0.5))}
					fill="none"
					stroke="rgba(255,255,255,0.18)"
					strokeDasharray="2 3"
				/>
			</svg>
		</div>
	);
}
