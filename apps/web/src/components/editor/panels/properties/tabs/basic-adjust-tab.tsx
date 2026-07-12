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
import { buildDefaultEffectInstance } from "@/lib/effects";

const ADJUST_PARAMS = [
	{
		label: "Temperature",
		type: "temperature",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
	{
		label: "Tint",
		type: "hue-rotate",
		min: -100,
		max: 100,
		default: 0,
		scale: 1.8,
	},
	{
		label: "Exposure",
		type: "brightness",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
	{
		label: "Contrast",
		type: "contrast",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
	{
		label: "Highlights",
		type: "highlights",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
	{
		label: "Shadows",
		type: "shadows",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
	{
		label: "Whites",
		type: "whites",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
	{
		label: "Blacks",
		type: "blacks",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
	{
		label: "Saturation",
		type: "saturation",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
	{
		label: "Vibrance",
		type: "vibrance",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
	{
		label: "Clarity",
		type: "clarity",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
	{
		label: "Dehaze",
		type: "dehaze",
		min: -100,
		max: 100,
		default: 0,
		scale: 0.01,
	},
];

export function BasicAdjustTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();

	const updateEffect = (effectType: string, value: number, scale: number) => {
		const effects = element.effects ?? [];
		const existingIndex = effects.findIndex((e) => e.type === effectType);

		// The WGSL shaders for brightness/contrast usually center at 1.0.
		// A slider from -100 to +100 means 0 is 1.0.
		// If value is 0, we can remove the effect (or set to 1.0).
		const actualValue = 1.0 + value * scale;

		if (value === 0 && existingIndex !== -1) {
			const nextEffects = [...effects];
			nextEffects.splice(existingIndex, 1);
			editor.timeline.updateElements({
				updates: [
					{ trackId, elementId: element.id, patch: { effects: nextEffects } },
				],
			});
			return;
		}

		if (existingIndex !== -1) {
			const nextEffects = [...effects];
			nextEffects[existingIndex] = {
				...nextEffects[existingIndex],
				params: { ...nextEffects[existingIndex].params, amount: actualValue },
			};
			editor.timeline.updateElements({
				updates: [
					{ trackId, elementId: element.id, patch: { effects: nextEffects } },
				],
			});
		} else if (value !== 0) {
			// Add new
			const newEffect = buildDefaultEffectInstance({ effectType });
			newEffect.params = { ...newEffect.params, amount: actualValue };
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: { effects: [...effects, newEffect] },
					},
				],
			});
		}
	};

	const getValue = (effectType: string, scale: number) => {
		const effect = (element.effects ?? []).find((e) => e.type === effectType);
		if (!effect) return 0;
		const raw = effect.params?.amount;
		const amount = typeof raw === "number" ? raw : 1.0;
		return (amount - 1.0) / scale;
	};

	return (
		<div className="flex flex-col gap-3 px-3.5 py-3">
			<Section
				card
				collapsible
				defaultOpen
				sectionKey={`${element.id}:basic-adjust`}
			>
				<SectionHeader>
					<SectionTitle>Basic Correction</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<SectionFields>
						{ADJUST_PARAMS.map((param) => {
							const val = getValue(param.type, param.scale);
							return (
								<SectionField key={param.label} label={param.label}>
									<NumberField
										value={val.toFixed(0)}
										onScrub={(v) => updateEffect(param.type, v, param.scale)}
										onReset={() => updateEffect(param.type, 0, param.scale)}
										isDefault={val === 0}
										scrubClamp={{ min: param.min, max: param.max }}
									/>
								</SectionField>
							);
						})}
					</SectionFields>
				</SectionContent>
			</Section>
		</div>
	);
}
