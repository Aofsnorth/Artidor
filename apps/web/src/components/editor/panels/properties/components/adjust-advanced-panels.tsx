"use client";

import { useRef, useState } from "react";
import type { VisualElement } from "@/lib/timeline";
import { useElementPreview } from "@/hooks/use-element-preview";
import {
	Section,
	SectionContent,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { AdjustSlider } from "./adjust-slider";
import {
	BARS_CONTROLS,
	DETAIL_CONTROLS,
	GLOW_GRAIN_CONTROLS,
	readGradeControlValue,
	readGradeNeutral,
	readWheelBiases,
	setGradeControlValue,
	setWheelBiases,
	TEMPERATURE_CONTROL,
	TINT_CONTROL,
	VIGNETTE_CONTROLS,
	WHEEL_IDS,
	WHEEL_LABELS,
	type GradeControl,
	type WheelBias,
	type WheelId,
} from "@/lib/effects/grade-controls";
import type { Effect } from "@/lib/effects/types";
import { cn } from "@/utils/ui";

type GradeEffectsApi = {
	effects: Effect[];
	/** Promote the preview overlay: ONE undo entry per gesture. */
	commit: () => void;
	readControl: (control: GradeControl) => number;
	previewControl: (control: GradeControl, sliderValue: number) => void;
	commitControl: (control: GradeControl, sliderValue: number) => void;
	previewEffects: (next: Effect[]) => void;
	commitEffects: (next: Effect[]) => void;
	readWheels: () => Record<WheelId, WheelBias>;
	previewWheels: (biases: Record<WheelId, WheelBias>) => void;
};

/**
 * Read/write plumbing for the advanced grading panels, shared by every panel
 * in this file.
 *
 * Every control writes a REGISTERED primitive effect that declares at least
 * one render pass, so moving a slider here changes the picture. The previous
 * implementation funnelled all nine panels into a single `davinci-adjust`
 * effect that was never registered: the params persisted, the inspector showed
 * them, and `resolveEffectPassGroups` filtered the effect out because
 * `effectsRegistry.has("davinci-adjust")` is false.
 *
 * Writes go through `useElementPreview`: continuous interactions preview into
 * the overlay and commit ONCE per gesture (pointer release / blur / key
 * release), so dragging a wheel or a bar produces a single undo entry instead
 * of one per pointer tick, while discrete controls (resets) commit
 * immediately.
 */
function useGradeEffects({
	trackId,
	element,
}: {
	trackId: string;
	element: VisualElement;
}): GradeEffectsApi {
	const { renderElement, previewUpdates, commit } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});
	const effects = (renderElement as VisualElement).effects ?? [];

	const previewEffects = (next: Effect[]) => previewUpdates({ effects: next });
	// Discrete action: stage the change, then promote the whole overlay as ONE
	// history command. `commitPreview` is a no-op when nothing is staged.
	const commitEffects = (next: Effect[]) => {
		previewUpdates({ effects: next });
		commit();
	};

	const writeControl = (
		control: GradeControl,
		sliderValue: number,
		now: boolean,
	) => {
		const next = setGradeControlValue({ effects, control, sliderValue });
		previewEffects(next);
		if (now) commitEffects(next);
	};

	return {
		effects,
		commit,
		previewEffects,
		commitEffects,
		readControl: (control) => readGradeControlValue(effects, control),
		previewControl: (control, sliderValue) =>
			writeControl(control, sliderValue, false),
		commitControl: (control, sliderValue) =>
			writeControl(control, sliderValue, true),
		readWheels: () => readWheelBiases(effects),
		previewWheels: (biases) =>
			previewEffects(setWheelBiases({ effects, biases })),
	};
}

/**
 * Render a table of controls as the inspector's slider rows.
 *
 * The neutral marker and the "is this at default" test both come from the
 * primitive's own declared default, so a control never looks modified while
 * storing nothing.
 */
function ControlRows({
	testIdPrefix,
	controls,
	read,
	preview,
	commitControl,
	commit,
}: {
	testIdPrefix: string;
	controls: readonly GradeControl[];
	read: (control: GradeControl) => number;
	preview: (control: GradeControl, sliderValue: number) => void;
	commitControl: (control: GradeControl, sliderValue: number) => void;
	commit: () => void;
}) {
	return (
		<SectionFields>
			{controls.map((control) => {
				const value = read(control);
				const neutral = readGradeNeutral(control);
				return (
					<AdjustSlider
						key={control.effectType}
						testId={`${testIdPrefix}-${control.effectType}`}
						label={control.label}
						value={value}
						min={control.sliderMin}
						max={control.sliderMax}
						step={control.step ?? 1}
						neutral={neutral}
						gradient={control.gradient}
						format={(v) => v.toFixed(control.decimals ?? 0)}
						isDefault={Math.abs(value - neutral) < 1e-6}
						onChange={(v) => preview(control, v)}
						onCommit={commit}
						onReset={() => commitControl(control, neutral)}
					/>
				);
			})}
		</SectionFields>
	);
}

/**
 * Primary wheels: the Lift / Gamma / Gain colour wheels plus the global
 * Temp / Tint sliders.
 *
 * The wheels write the `color-wheels` effect, whose three params are hex
 * colours; `wheelBiasToHex` does the conversion (see `grade-controls.ts`).
 * The fourth "Offset" wheel and the "Y only" master were REMOVED: neither has
 * a rendering home — `color-wheels` has no offset param, and no registered
 * primitive exposes a luma-only grade switch.
 *
 * `color-wheels`' current WGSL only uploads LIFT (see
 * `rust/crates/effects/src/pipeline.rs`), so Gamma and Gain persist and read
 * back correctly but do not yet reach the GPU. That is a shader-side gap in a
 * registered, rendering effect — not another dead control.
 */
export function AdjustWheelsPanel({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const grade = useGradeEffects({ trackId, element });
	const biases = grade.readWheels();
	const globalControls = [TEMPERATURE_CONTROL, TINT_CONTROL];

	// One gesture, one undo entry: build the whole reset in memory and commit
	// it once rather than writing the wheels and the sliders separately.
	const resetAll = () => {
		let next = setWheelBiases({
			effects: grade.effects,
			biases: {
				lift: { x: 0, y: 0, luma: 0 },
				gamma: { x: 0, y: 0, luma: 0 },
				gain: { x: 0, y: 0, luma: 0 },
			},
		});
		for (const control of globalControls) {
			next = setGradeControlValue({
				effects: next,
				control,
				sliderValue: readGradeNeutral(control),
			});
		}
		grade.commitEffects(next);
	};

	return (
		<Section
			card
			collapsible
			defaultOpen
			sectionKey={`${element.id}:adjust:wheels`}
		>
			<SectionHeader
				trailing={
					<button
						type="button"
						onClick={resetAll}
						className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-white/55 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
					>
						Reset all
					</button>
				}
			>
				<SectionTitle>Primary Wheels</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="mb-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-2.5">
					<div className="mb-1.5 flex items-center justify-between">
						<div className="flex items-center gap-1">
							<span className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/65">
								Global
							</span>
						</div>
					</div>
					<div className="flex items-center gap-3">
						{globalControls.map((control) => (
							<ControlRows
								key={control.effectType}
								testIdPrefix="wheels"
								controls={[control]}
								read={grade.readControl}
								preview={grade.previewControl}
								commitControl={grade.commitControl}
								commit={grade.commit}
							/>
						))}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3">
					{WHEEL_IDS.map((id) => (
						<ColorWheel
							key={id}
							label={WHEEL_LABELS[id]}
							bias={biases[id]}
							onChange={(next) =>
								grade.previewWheels({ ...biases, [id]: next })
							}
							onCommit={grade.commit}
						/>
					))}
				</div>
			</SectionContent>
		</Section>
	);
}

function ColorWheel({
	label,
	bias,
	onChange,
	onCommit,
}: {
	label: string;
	bias: WheelBias;
	onChange: (bias: WheelBias) => void;
	onCommit: () => void;
}) {
	const svgRef = useRef<SVGSVGElement>(null);
	const [dragging, setDragging] = useState(false);

	const radius = 100;
	const handleX = 120 + bias.x * radius;
	const handleY = 120 + bias.y * radius;
	const r = Math.round(((-bias.x + 1) / 2) * 255);
	const g = Math.round(((bias.x - bias.y) / 2 + 0.5) * 255);
	const b = Math.round(((bias.y + 1) / 2) * 255);
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
			nx = px / dist;
			ny = py / dist;
		}
		onChange({
			...bias,
			x: Math.max(-1, Math.min(1, nx)),
			y: Math.max(-1, Math.min(1, ny)),
		});
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
					onCommit();
				}}
				onDoubleClick={() => {
					onChange({ ...bias, x: 0, y: 0 });
					onCommit();
				}}
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
				value={bias.luma}
				onChange={(e) =>
					onChange({ ...bias, luma: Number.parseFloat(e.target.value) })
				}
				onPointerUp={onCommit}
				onKeyUp={onCommit}
				onBlur={onCommit}
				aria-label={`${label} luma`}
				className="w-full max-w-[240px] accent-white/80"
			/>
			<div className="text-[0.6rem] text-white/40 font-mono">
				{bias.x.toFixed(2)} / {bias.y.toFixed(2)} · Y {bias.luma.toFixed(2)}
			</div>
		</div>
	);
}

/**
 * Primary bars: contrast, highlights, shadows, whites, blacks, saturation and
 * hue, each on its own registered primitive.
 *
 * Pivot, midtone detail and the luma/chroma mix pair were REMOVED — no
 * registered primitive exposes a tonal pivot, a local-detail control or a
 * luma/chroma separator, so they had nowhere to go but a dead param.
 */
export function AdjustBarsPanel({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const grade = useGradeEffects({ trackId, element });
	return (
		<Section
			card
			collapsible
			defaultOpen
			sectionKey={`${element.id}:adjust:bars`}
		>
			<SectionHeader>
				<SectionTitle>Primary Bars</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<ControlRows
					testIdPrefix="bars"
					controls={BARS_CONTROLS}
					read={grade.readControl}
					preview={grade.previewControl}
					commitControl={grade.commitControl}
					commit={grade.commit}
				/>
			</SectionContent>
		</Section>
	);
}

/**
 * Detail: peaking sharpen (`sharpen`), spatial blur (`box-blur`) and defog
 * (`dehaze`).
 */
export function AdjustSharpenBlurPanel({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const grade = useGradeEffects({ trackId, element });
	return (
		<Section card collapsible sectionKey={`${element.id}:adjust:sharpen-blur`}>
			<SectionHeader>
				<SectionTitle>Sharpening & Blur</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<ControlRows
					testIdPrefix="detail"
					controls={DETAIL_CONTROLS}
					read={grade.readControl}
					preview={grade.previewControl}
					commitControl={grade.commitControl}
					commit={grade.commit}
				/>
			</SectionContent>
		</Section>
	);
}

/**
 * Bloom and film texture.
 *
 * Halation radius was REMOVED: `glow` takes a single `amount` and no
 * registered primitive exposes a halation radius.
 */
export function AdjustGlowGrainPanel({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const grade = useGradeEffects({ trackId, element });
	return (
		<Section card collapsible sectionKey={`${element.id}:adjust:glow-grain`}>
			<SectionHeader>
				<SectionTitle>Glow / Grain</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<ControlRows
					testIdPrefix="glow"
					controls={GLOW_GRAIN_CONTROLS}
					read={grade.readControl}
					preview={grade.previewControl}
					commitControl={grade.commitControl}
					commit={grade.commit}
				/>
			</SectionContent>
		</Section>
	);
}

/**
 * Vignette. The `vignette` primitive reads a single `amount`, so the old
 * offset / softness / roundness / per-zone controls — none of which had a
 * rendering home — are folded into this single slider.
 */
export function AdjustVignettePanel({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const grade = useGradeEffects({ trackId, element });
	return (
		<Section card collapsible sectionKey={`${element.id}:adjust:vignette`}>
			<SectionHeader>
				<SectionTitle>Vignette</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<ControlRows
					testIdPrefix="vig"
					controls={VIGNETTE_CONTROLS}
					read={grade.readControl}
					preview={grade.previewControl}
					commitControl={grade.commitControl}
					commit={grade.commit}
				/>
			</SectionContent>
		</Section>
	);
}
