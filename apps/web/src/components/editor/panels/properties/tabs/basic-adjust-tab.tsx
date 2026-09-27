"use client";

import type { VisualElement } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { NumberField } from "@/components/ui/number-field";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowTurnBackwardIcon,
	SlidersVerticalIcon,
} from "@hugeicons/core-free-icons";
import { buildDefaultEffectInstance } from "@/lib/effects";
import {
	BASIC_ADJUST_CONTROLS,
	BASIC_ADJUST_GROUP_ORDER,
	resolveBasicAdjustAmount,
	resolveBasicAdjustSliderValue,
} from "@/lib/effects/basic-adjust";

/**
 * CapCut-style Adjust panel: one slider per registered primitive effect, split
 * into the same sections CapCut uses (Light / Color / Detail / Creative). The
 * slider↔param mapping lives in `lib/effects/basic-adjust` because the
 * primitives disagree about their neutral value — this tab used to hardcode
 * `1 + value * scale`, which wrote a non-neutral amount for every control and
 * made the tab look broken.
 *
 * Every field is CONTROLLED by `element.effects` (no local state), so a store
 * write always echoes back into the field the user is dragging.
 *
 * A control at neutral is removed from the element, so an untouched element
 * resolves to zero effect passes (no per-frame cost).
 */
export function BasicAdjustTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const effects = element.effects ?? [];

	const updateEffects = (nextEffects: VisualElement["effects"]) => {
		editor.timeline.updateElements({
			updates: [
				{ trackId, elementId: element.id, patch: { effects: nextEffects } },
			],
		});
	};

	const setSliderValue = (
		effectType: string,
		sliderValue: number,
		sliderMin: number,
		sliderMax: number,
	) => {
		const existingIndex = effects.findIndex((e) => e.type === effectType);
		const amount = resolveBasicAdjustAmount({
			effectType,
			sliderValue,
			sliderMin,
			sliderMax,
		});

		if (amount === null) {
			// Neutral: drop the effect entirely instead of storing a no-op pass.
			if (existingIndex === -1) return;
			const nextEffects = [...effects];
			nextEffects.splice(existingIndex, 1);
			updateEffects(nextEffects);
			return;
		}

		updateEffects(
			existingIndex === -1
				? [
						...effects,
						{
							...buildDefaultEffectInstance({ effectType }),
							params: { amount },
						},
					]
				: effects.map((effect, index) =>
						index === existingIndex
							? { ...effect, params: { ...effect.params, amount } }
							: effect,
					),
		);
	};

	const resetGroup = (groupEffectTypes: readonly string[]) => {
		const nextEffects = effects.filter(
			(effect) => !groupEffectTypes.includes(effect.type),
		);
		if (nextEffects.length === effects.length) return;
		updateEffects(nextEffects);
	};

	return (
		<div className="flex flex-col gap-3 px-3.5 py-3">
			{BASIC_ADJUST_GROUP_ORDER.map((group) => {
				const controls = BASIC_ADJUST_CONTROLS.filter(
					(control) => control.group === group,
				);
				const groupEffectTypes = controls.map((control) => control.effectType);
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
										onClick={() => resetGroup(groupEffectTypes)}
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
									const effect = effects.find(
										(e) => e.type === control.effectType,
									);
									const raw = effect?.params?.amount;
									const amount = typeof raw === "number" ? raw : undefined;
									const displayValue = resolveBasicAdjustSliderValue({
										effectType: control.effectType,
										amount,
										sliderMin: control.sliderMin,
										sliderMax: control.sliderMax,
									});
									const neutral = resolveBasicAdjustSliderValue({
										effectType: control.effectType,
										amount: undefined,
										sliderMin: control.sliderMin,
										sliderMax: control.sliderMax,
									});
									return (
										<SectionField
											key={control.effectType}
											label={control.label}
										>
											<NumberField
												icon={<HugeiconsIcon icon={SlidersVerticalIcon} />}
												value={Math.round(displayValue).toString()}
												scrubClamp={{
													min: control.sliderMin,
													max: control.sliderMax,
												}}
												onChange={(event) => {
													const next = Number.parseFloat(event.target.value);
													if (Number.isFinite(next)) {
														setSliderValue(
															control.effectType,
															next,
															control.sliderMin,
															control.sliderMax,
														);
													}
												}}
												onScrub={(next) =>
													setSliderValue(
														control.effectType,
														next,
														control.sliderMin,
														control.sliderMax,
													)
												}
												onReset={() =>
													setSliderValue(
														control.effectType,
														neutral,
														control.sliderMin,
														control.sliderMax,
													)
												}
												isDefault={Math.abs(displayValue - neutral) < 1e-6}
											/>
										</SectionField>
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
