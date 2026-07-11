"use client";

import { useEditor } from "@/hooks/use-editor";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowTurnBackwardIcon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
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
import { cn } from "@/utils/ui";
import { useI18n } from "@/lib/i18n";

/**
 * DaVinci-style HSL Qualifier. The 3-channel qualifier uses a
 * 3-band "Center / Range / Softness" model per channel (Hue, Sat,
 * Lum) plus a "Highlight matte" toggle for viewing the B/W key,
 * invert, and a master Range slider.
 *
 * The component writes to the same `davinci-adjust` effect that
 * the rest of the Advanced card reads, so the grade stays in
 * sync with the other wheels / bars / curves.
 */
export function QualifierSubTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const { t } = useI18n();
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
		setParam("qual_hsl_enabled", 1);
		setParam("qual_lum_enabled", 1);
		setParam("qual_sat_enabled", 1);
		setParam("qual_range", 0.1);
		setParam("qual_high_softness", 0.1);
		setParam("qual_low_softness", 0.1);
		setParam("qual_low", 0);
		setParam("qual_mid", 0.5);
		setParam("qual_high", 1);
	};

	const showMatte = (params.qual_hsl_enabled ?? 1) > 0;

	return (
		<div className="flex flex-col gap-3">
			<QualifierSection title={t("qualifier.section.channelToggles")} sectionKey="channel-toggles">
				<div className="grid grid-cols-3 gap-1.5">
					<ChannelToggle
						label={t("qualifier.channel.hue")}
						checked={(params.qual_hsl_enabled ?? 1) > 0.5}
						onToggle={(v) => setParam("qual_hsl_enabled", v ? 1 : 0)}
					/>
					<ChannelToggle
						label={t("qualifier.channel.sat")}
						checked={(params.qual_sat_enabled ?? 1) > 0.5}
						onToggle={(v) => setParam("qual_sat_enabled", v ? 1 : 0)}
					/>
					<ChannelToggle
						label={t("qualifier.channel.lum")}
						checked={(params.qual_lum_enabled ?? 1) > 0.5}
						onToggle={(v) => setParam("qual_lum_enabled", v ? 1 : 0)}
					/>
				</div>
			</QualifierSection>

			<QualifierSection
				title={t("qualifier.section.rangeBars")}
				sectionKey="range-bars"
				trailing={
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
						{t("qualifier.reset")}
					</Button>
				}
			>
				<SectionFields>
					<SectionField label={t("qualifier.masterRange")}>
						<Slider
							min={0}
							max={1}
							step={0.001}
							value={[params.qual_range ?? 0.1]}
							onValueChange={(v) => setParam("qual_range", v[0] ?? 0)}
						/>
					</SectionField>
					<SectionField label={t("qualifier.lowSoftness")}>
						<Slider
							min={0}
							max={1}
							step={0.001}
							value={[params.qual_low_softness ?? 0.1]}
							onValueChange={(v) => setParam("qual_low_softness", v[0] ?? 0)}
						/>
					</SectionField>
					<SectionField label={t("qualifier.highSoftness")}>
						<Slider
							min={0}
							max={1}
							step={0.001}
							value={[params.qual_high_softness ?? 0.1]}
							onValueChange={(v) => setParam("qual_high_softness", v[0] ?? 0)}
						/>
					</SectionField>
				</SectionFields>
			</QualifierSection>

			<QualifierSection title={t("qualifier.section.lumaRange")} sectionKey="luma-range">
				<div className="flex flex-col gap-2">
					<RangeBar
						low={params.qual_low ?? 0}
						mid={params.qual_mid ?? 0.5}
						high={params.qual_high ?? 1}
						onChange={(key, v) => setParam(key, v)}
					/>
					<div className="grid grid-cols-3 gap-2 text-[0.6rem] uppercase tracking-wider text-white/40">
						<span>{t("qualifier.shadows")}</span>
						<span className="text-center">{t("qualifier.midtones")}</span>
						<span className="text-right">{t("qualifier.highlights")}</span>
					</div>
				</div>
			</QualifierSection>

			<QualifierSection
				title={t("qualifier.section.matteFinesse")}
				sectionKey="matte-finesse"
				trailing={
					<span
						className={cn(
							"rounded-full border px-1.5 py-0.5 text-[0.6rem] font-mono",
							showMatte
								? "border-cyan-300/30 bg-cyan-400/10 text-cyan-200"
								: "border-white/10 bg-white/5 text-white/45",
						)}
					>
						{showMatte ? t("qualifier.matte.blackWhite") : t("qualifier.matte.color")}
					</span>
				}
			>
				<p className="text-[0.66rem] text-white/45 leading-relaxed">
					{t("qualifier.description")}
				</p>
			</QualifierSection>
		</div>
	);
}

function QualifierSection({
	title,
	sectionKey,
	trailing,
	children,
}: {
	title: string;
	sectionKey: string;
	trailing?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<Section
			collapsible
			defaultOpen
			sectionKey={`qualifier-${sectionKey}`}
		>
			<SectionHeader trailing={trailing}>
				<SectionTitle>{title}</SectionTitle>
			</SectionHeader>
			<SectionContent>{children}</SectionContent>
		</Section>
	);
}

function ChannelToggle({
	label,
	checked,
	onToggle,
}: {
	label: string;
	checked: boolean;
	onToggle: (next: boolean) => void;
}) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-1.5 rounded-md border px-2.5 py-1.5 transition",
				checked
					? "border-cyan-300/30 bg-cyan-400/8 text-cyan-100"
					: "border-white/[0.08] bg-white/[0.02] text-white/55",
			)}
		>
			<span className="text-[0.7rem] font-medium uppercase tracking-wider">
				{label}
			</span>
			<Switch checked={checked} onCheckedChange={onToggle} />
		</div>
	);
}

/**
 * Triple-handle range bar (Low — Mid — High). Drags each handle
 * horizontally; updates the corresponding `qual_*` param.
 */
function RangeBar({
	low,
	mid,
	high,
	onChange,
}: {
	low: number;
	mid: number;
	high: number;
	onChange: (key: "qual_low" | "qual_mid" | "qual_high", v: number) => void;
}) {
	const { t } = useI18n();
	const containerRef = useRef<HTMLDivElement>(null);
	const [dragging, setDragging] = useState<null | "low" | "mid" | "high">(null);

	useEffect(() => {
		if (!dragging) return;
		const onMove = (event: PointerEvent) => {
			const el = containerRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const t = Math.max(
				0,
				Math.min(1, (event.clientX - rect.left) / rect.width),
			);
			onChange(
				dragging === "low"
					? "qual_low"
					: dragging === "mid"
						? "qual_mid"
						: "qual_high",
				t,
			);
		};
		const onUp = () => setDragging(null);
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		return () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
	}, [dragging, onChange]);

	return (
		<div className="flex flex-col gap-2">
			<div
				ref={containerRef}
				className="relative h-6 w-full rounded-md border border-white/[0.08] bg-gradient-to-r from-black via-[#1a1a1a] to-white"
			>
				{/* Range mask between low and high */}
				<div
					className="absolute inset-y-0 border-x-2 border-cyan-300/55 bg-cyan-400/8"
					style={{
						left: `${low * 100}%`,
						right: `${(1 - high) * 100}%`,
					}}
				/>
				{/* Low handle */}
				<button
					type="button"
					aria-label={t("qualifier.handle.low")}
					onPointerDown={(e) => {
						e.preventDefault();
						(e.currentTarget as Element).setPointerCapture(e.pointerId);
						setDragging("low");
					}}
					className="absolute top-0 size-6 -translate-x-1/2 cursor-ew-resize"
					style={{ left: `${low * 100}%` }}
				>
					<span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 bg-[#09090b] shadow-[0_0_8px_rgba(103,232,249,0.4)]" />
				</button>
				{/* Mid handle */}
				<button
					type="button"
					aria-label={t("qualifier.handle.mid")}
					onPointerDown={(e) => {
						e.preventDefault();
						(e.currentTarget as Element).setPointerCapture(e.pointerId);
						setDragging("mid");
					}}
					className="absolute top-0 size-6 -translate-x-1/2 cursor-ew-resize"
					style={{ left: `${mid * 100}%` }}
				>
					<span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#09090b] shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
				</button>
				{/* High handle */}
				<button
					type="button"
					aria-label={t("qualifier.handle.high")}
					onPointerDown={(e) => {
						e.preventDefault();
						(e.currentTarget as Element).setPointerCapture(e.pointerId);
						setDragging("high");
					}}
					className="absolute top-0 size-6 -translate-x-1/2 cursor-ew-resize"
					style={{ left: `${high * 100}%` }}
				>
					<span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 bg-[#09090b] shadow-[0_0_8px_rgba(103,232,249,0.4)]" />
				</button>
			</div>
			<div className="grid grid-cols-3 gap-2">
				<NumberField
					value={(low * 255).toFixed(0)}
					min={0}
					max={255}
					step={1}
					onChange={(e) =>
						onChange(
							"qual_low",
							Math.max(
								0,
								Math.min(255, Number.parseFloat(e.target.value) || 0),
							) / 255,
						)
					}
					onReset={() => onChange("qual_low", 0)}
					isDefault={low === 0}
					suffix={t("qualifier.suffix.shadows")}
				/>
				<NumberField
					value={(mid * 255).toFixed(0)}
					min={0}
					max={255}
					step={1}
					onChange={(e) =>
						onChange(
							"qual_mid",
							Math.max(
								0,
								Math.min(255, Number.parseFloat(e.target.value) || 0),
							) / 255,
						)
					}
					onReset={() => onChange("qual_mid", 0.5)}
					isDefault={Math.abs(mid - 0.5) < 0.005}
					suffix={t("qualifier.suffix.midtones")}
				/>
				<NumberField
					value={(high * 255).toFixed(0)}
					min={0}
					max={255}
					step={1}
					onChange={(e) =>
						onChange(
							"qual_high",
							Math.max(
								0,
								Math.min(255, Number.parseFloat(e.target.value) || 0),
							) / 255,
						)
					}
					onReset={() => onChange("qual_high", 1)}
					isDefault={high === 1}
					suffix={t("qualifier.suffix.highlights")}
				/>
			</div>
		</div>
	);
}
