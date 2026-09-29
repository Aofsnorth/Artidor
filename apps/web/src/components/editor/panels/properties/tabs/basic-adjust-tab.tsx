"use client";

import { useState } from "react";
import type { VisualElement } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import { useElementPreview } from "@/hooks/use-element-preview";
import {
	Section,
	SectionContent,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowTurnBackwardIcon,
	Copy01Icon,
	ClipboardIcon,
	MagicWand05Icon,
} from "@hugeicons/core-free-icons";
import { AdjustSlider } from "../components/adjust-slider";
import {
	copyAdjustment,
	copyWholeGrade,
	hasCopiedAdjustment,
	pasteAdjustmentValue,
	readWholeGrade,
} from "../components/adjust-clipboard";
import {
	ADJUSTMENT_PRESETS,
	applyAdjustmentValues,
	clearAdjustments,
	readAdjustmentValues,
	readNeutralValue,
	scaleAdjustments,
	setAdjustmentValue,
	unscaleAdjustments,
	type AdjustmentValues,
} from "@/lib/effects/basic-adjust-actions";
import {
	BASIC_ADJUST_CONTROLS,
	BASIC_ADJUST_GROUP_ORDER,
} from "@/lib/effects/basic-adjust";

/**
 * Semantic track gradients: the track colour hints at what the control does
 * (blue→amber for temperature, a hue spectrum for hue, …) so the panel reads
 * as a set of distinct instruments instead of a wall of identical grey bars.
 */
const CONTROL_GRADIENTS: Record<string, string> = {
	brightness: "linear-gradient(to right, #000000, #ffffff)",
	exposure: "linear-gradient(to right, #050505, #f5f5f5)",
	contrast: "linear-gradient(to right, #52525b, #18181b 50%, #fafafa)",
	highlights: "linear-gradient(to right, #3f3f46 50%, #fefce8)",
	shadows: "linear-gradient(to right, #09090b, #52525b 50%, #71717a)",
	temperature: "linear-gradient(to right, #3b82f6, #d4d4d8 50%, #f59e0b)",
	"tint-shift": "linear-gradient(to right, #22c55e, #d4d4d8 50%, #ec4899)",
	"hue-rotate":
		"linear-gradient(to right, #f87171, #facc15, #4ade80, #22d3ee, #818cf8, #e879f9, #f87171)",
	saturation: "linear-gradient(to right, #a1a1aa, #d4d4d8 50%, #f472b6)",
	vibrance: "linear-gradient(to right, #a1a1aa, #d4d4d8 50%, #60a5fa)",
};

const CREATIVE_PRESETS = [
	{ label: "Off", value: 0 },
	{ label: "Low", value: 30 },
	{ label: "Mid", value: 60 },
	{ label: "High", value: 100 },
] as const;

const formatSigned = (value: number) =>
	`${value > 0 ? "+" : ""}${Math.round(value)}`;

const INTENSITY_DEFAULT = 100;

/**
 * The "Basic" sub-panel of the Adjust tab.
 *
 * Storage: every adjustment is its own registered primitive effect; a control
 * at neutral simply has no effect. `basic-adjust.ts` owns the slider↔param
 * mapping and `basic-adjust-actions.ts` owns what the toolbar buttons do, so
 * this file is presentation plus gesture wiring.
 *
 * Writes follow the preview/commit pattern (`useElementPreview`): a drag
 * updates the preview overlay and pushes a single history command on
 * release. The previous implementation wrote one command per pointer tick
 * from a stale closure, which both flooded undo and made released sliders
 * snap back to their starting value.
 *
 * The master Intensity slider is stateless by construction: the element only
 * stores the BASE grade, and the displayed value is derived by scaling it, so
 * moving intensity can never drift the underlying adjustments. It is session
 * state rather than a stored effect on purpose — no registered effect means
 * "scale the whole grade", and writing one (as this panel used to, as
 * `davinci-adjust`) just persisted a param the renderer skips.
 */
export function BasicAdjustTab({
	element,
	trackId,
	onApplyAll,
}: {
	element: VisualElement;
	trackId: string;
	/** Supplied by the tab shell; enables the "apply to all" action. */
	onApplyAll?: () => void;
}) {
	const editor = useEditor();
	const { renderElement, previewUpdates, commit } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});
	const [copiedTick, setCopiedTick] = useState(0);
	const [intensity, setIntensity] = useState(INTENSITY_DEFAULT);

	const effects = (renderElement as VisualElement).effects ?? [];
	const baseValues = readAdjustmentValues(effects);
	const displayed = scaleAdjustments({
		values: baseValues,
		intensity: intensity / 100,
	});

	const writeEffects = (
		nextEffects: VisualElement["effects"],
		commitNow: boolean,
	) => {
		if (commitNow) {
			editor.timeline.updateElements({
				updates: [
					{ trackId, elementId: element.id, patch: { effects: nextEffects } },
				],
			});
			return;
		}
		previewUpdates({ effects: nextEffects });
	};

	/** Write adjustment values, previewing unless `commitNow`. */
	const writeValues = (values: AdjustmentValues, commitNow: boolean) => {
		writeEffects(applyAdjustmentValues({ effects, values }), commitNow);
	};

	// A slider moved by hand works in DISPLAYED space, so it has to be divided
	// back through the current intensity before it is stored as base.
	const setDisplayedValue = (
		effectType: string,
		sliderValue: number,
		commitNow: boolean,
	) => {
		const base = unscaleAdjustments({
			values: { [effectType]: sliderValue },
			intensity: intensity / 100,
		});
		writeEffects(
			setAdjustmentValue({
				effects,
				effectType,
				sliderValue: base[effectType] ?? 0,
			}),
			commitNow,
		);
	};

	const resetAll = () => {
		writeEffects(clearAdjustments(effects), true);
	};

	const applyPreset = (presetId: string) => {
		const preset = ADJUSTMENT_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		if (preset.id === "none") {
			writeEffects(clearAdjustments(effects), true);
			return;
		}
		writeValues(preset.values, true);
	};

	const handleCopyGrade = () => {
		copyWholeGrade(displayed);
		// The grade clipboard is module state, and React only re-reads it on the
		// next render. A render already in flight when Copy is clicked can
		// therefore commit with the PRE-copy value, leaving Paste disabled
		// until some unrelated update happens to re-render the panel. Bumping
		// the tick forces a fresh render that reads the current slot.
		setCopiedTick((n) => n + 1);
	};

	const handlePasteGrade = () => {
		const grade = readWholeGrade();
		if (!grade) return;
		writeValues(grade, true);
	};

	const handleCopyValue = (effectType: string, label: string) => {
		copyAdjustment({
			effectType,
			label,
			value: displayed[effectType] ?? readNeutralValue(effectType),
		});
		// Re-render so the other rows' paste buttons enable immediately.
		setCopiedTick((n) => n + 1);
	};

	const handlePasteValue = (effectType: string) => {
		const pasted = pasteAdjustmentValue();
		if (pasted === null) return;
		setDisplayedValue(effectType, pasted, true);
	};

	const hasGrade = Object.keys(baseValues).length > 0;

	return (
		<div className="flex flex-col gap-3 px-3.5 py-3">
			{/* CapCut-style top-level actions: auto-correct, copy/paste the
			    whole grade, reset, and push the grade to the rest of the
			    selection. */}
			<div className="flex flex-wrap items-center gap-1.5">
				<Button
					variant="secondary"
					size="sm"
					className="h-7 px-2 text-[0.68rem]"
					data-testid="adjust-auto"
					onClick={() => {
						const preset = ADJUSTMENT_PRESETS.find((p) => p.id === "auto");
						if (preset) writeValues(preset.values, true);
					}}
				>
					<HugeiconsIcon icon={MagicWand05Icon} className="mr-1 size-3" />
					Auto
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-[0.68rem]"
					data-testid="adjust-copy-grade"
					disabled={!hasGrade}
					onClick={handleCopyGrade}
				>
					<HugeiconsIcon icon={Copy01Icon} className="mr-1 size-3" />
					Copy
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-[0.68rem]"
					data-testid="adjust-paste-grade"
					disabled={!copiedTick || !readWholeGrade()}
					onClick={handlePasteGrade}
				>
					<HugeiconsIcon icon={ClipboardIcon} className="mr-1 size-3" />
					Paste
				</Button>
				{onApplyAll && (
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-[0.68rem]"
						data-testid="adjust-apply-all"
						disabled={!hasGrade}
						onClick={onApplyAll}
					>
						Apply all
					</Button>
				)}
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-[0.68rem]"
					data-testid="adjust-reset-all"
					disabled={!hasGrade}
					onClick={resetAll}
				>
					<HugeiconsIcon icon={ArrowTurnBackwardIcon} className="mr-1 size-3" />
					Reset
				</Button>
			</div>

			{/* Master intensity. Stores the BASE grade only; everything below
			    renders scaled, so this is drift-free. */}
			<AdjustSlider
				testId="adjust-intensity"
				label="Intensity"
				value={intensity}
				min={0}
				max={200}
				neutral={INTENSITY_DEFAULT}
				format={(v) => `${Math.round(v)}%`}
				isDefault={intensity === INTENSITY_DEFAULT}
				onChange={setIntensity}
				// Intensity never touches the element, so a gesture has nothing
				// to commit — `commitPreview` is a no-op with an empty overlay.
				onCommit={commit}
				onReset={() => setIntensity(INTENSITY_DEFAULT)}
			/>

			<div className="flex flex-col gap-1.5">
				<span className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
					Presets
				</span>
				<div className="flex flex-wrap gap-1">
					{ADJUSTMENT_PRESETS.map((preset) => (
						<button
							key={preset.id}
							type="button"
							data-testid={`adjust-preset-${preset.id}`}
							onClick={() => applyPreset(preset.id)}
							className="rounded-md border border-white/8 bg-white/3 px-2 py-1 text-[0.65rem] text-muted-foreground transition hover:border-white/20 hover:bg-white/8 hover:text-foreground"
						>
							{preset.label}
						</button>
					))}
				</div>
			</div>

			{BASIC_ADJUST_GROUP_ORDER.map((group) => {
				const controls = BASIC_ADJUST_CONTROLS.filter(
					(control) => control.group === group,
				);
				const groupEffectTypes = controls.map((c) => c.effectType);
				const isGroupModified = effects.some((effect) =>
					groupEffectTypes.includes(effect.type),
				);

				return (
					<Section
						key={group}
						card
						collapsible
						defaultOpen
						sectionKey={`${element.id}:adjust:${group}`}
					>
						<SectionHeader
							trailing={
								isGroupModified ? (
									<Button
										variant="ghost"
										size="icon"
										aria-label={`Reset ${group.toLowerCase()} adjustments`}
										onClick={() => {
											const next = effects.filter(
												(effect) => !groupEffectTypes.includes(effect.type),
											);
											writeEffects(next, true);
										}}
									>
										<HugeiconsIcon
											icon={ArrowTurnBackwardIcon}
											className="size-3.5!"
										/>
									</Button>
								) : undefined
							}
						>
							<SectionTitle>{group}</SectionTitle>
						</SectionHeader>
						<SectionContent>
							<SectionFields>
								{controls.map((control) => {
									const neutral = readNeutralValue(control.effectType);
									const value = Math.round(
										displayed[control.effectType] ?? neutral,
									);
									const isDefault = Math.abs(value - neutral) < 1e-6;
									return (
										<AdjustSlider
											key={control.effectType}
											testId={`adjust-${control.effectType}`}
											label={control.label}
											value={value}
											min={control.sliderMin}
											max={control.sliderMax}
											neutral={neutral}
											gradient={CONTROL_GRADIENTS[control.effectType]}
											format={formatSigned}
											isDefault={isDefault}
											stepper={group === "Detail"}
											presets={
												group === "Creative" ? CREATIVE_PRESETS : undefined
											}
											// `copiedTick` is read so the paste buttons
											// re-enable the moment a value is copied.
											hasCopiedValue={
												Boolean(copiedTick) && hasCopiedAdjustment()
											}
											onChange={(v) =>
												setDisplayedValue(control.effectType, v, false)
											}
											onCommit={commit}
											onReset={() =>
												setDisplayedValue(control.effectType, neutral, true)
											}
											onCopy={() =>
												handleCopyValue(control.effectType, control.label)
											}
											onPaste={() => handlePasteValue(control.effectType)}
										/>
									);
								})}
							</SectionFields>
						</SectionContent>
					</Section>
				);
			})}
		</div>
	);
}
