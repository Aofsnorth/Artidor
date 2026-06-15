import type { EffectDefinition } from "@/lib/effects/types";

// Note: curves and HSL store their data in the effect's params via raw access
// (e.g. element.effects[i].params). The ParamDefinition system doesn't have a
// "string" type, so we only declare the numeric/boolean knobs here. The
// UI tab reads/writes curves and LUT data through the element directly.

export const hslAdjustmentDefinition: EffectDefinition = {
	type: "hsl",
	name: "HSL",
	keywords: ["hsl", "hue", "saturation", "luminance", "adjust"],
	params: [
		{
			key: "hue",
			label: "Hue",
			type: "number",
			default: 0,
			min: -180,
			max: 180,
			step: 1,
		},
		{
			key: "saturation",
			label: "Saturation",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "luminance",
			label: "Luminance",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [],
	},
};

export const curvesAdjustmentDefinition: EffectDefinition = {
	type: "curves",
	name: "RGB Curves",
	keywords: ["curves", "rgb", "tone", "adjust"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 100,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [],
	},
};

export const lutAdjustmentDefinition: EffectDefinition = {
	type: "lut",
	name: "LUT",
	keywords: ["lut", "cube", "color", "look", "adjust"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 100,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [],
	},
};
