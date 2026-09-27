import {
	BASIC_ADJUST_CONTROLS,
	resolveBasicAdjustAmount,
	resolveBasicAdjustSliderValue,
} from "@/lib/effects/basic-adjust";
import { effectsRegistry, registerDefaultEffects } from "@/lib/effects";

registerDefaultEffects();

for (const control of BASIC_ADJUST_CONTROLS) {
	const def = effectsRegistry.get(control.effectType);
	const amountParam = def.params.find((p) => p.key === "amount");
	const neutralSlider = resolveBasicAdjustSliderValue({
		effectType: control.effectType,
		amount: undefined,
		sliderMin: control.sliderMin,
		sliderMax: control.sliderMax,
	});
	const atMin = resolveBasicAdjustAmount({
		effectType: control.effectType,
		sliderValue: control.sliderMin,
		sliderMin: control.sliderMin,
		sliderMax: control.sliderMax,
	});
	const atMax = resolveBasicAdjustAmount({
		effectType: control.effectType,
		sliderValue: control.sliderMax,
		sliderMin: control.sliderMin,
		sliderMax: control.sliderMax,
	});
	const neutralAmount = amountParam?.default;
	process.stdout.write(
		[
			control.label.padEnd(12),
			control.effectType.padEnd(13),
			`param[min=${amountParam?.min},max=${amountParam?.max},def=${neutralAmount}]`.padEnd(38),
			`slider[${control.sliderMin}..${control.sliderMax}]`.padEnd(18),
			`neutralShown=${neutralSlider}`.padEnd(18),
			`@min->${atMin}`,
			`@max->${atMax}`,
		].join(" "),
	);
	process.stdout.write("\n");
	// Round-trip sanity: the amount the neutral slider implies must be the default.
	const implied = resolveBasicAdjustAmount({
		effectType: control.effectType,
		sliderValue: neutralSlider,
		sliderMin: control.sliderMin,
		sliderMax: control.sliderMax,
	});
	if (implied !== null) {
		process.stdout.write(
			`  !! neutral slider ${neutralSlider} implies amount ${implied}, expected no-op\n`,
		);
	}
}
