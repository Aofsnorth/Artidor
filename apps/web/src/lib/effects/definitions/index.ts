import { effectsRegistry } from "../registry";
import { blurEffectDefinition } from "./blur";
import { brightnessAdjustmentDefinition } from "./adjustments/brightness";
import { contrastAdjustmentDefinition } from "./adjustments/contrast";
import { saturationAdjustmentDefinition } from "./adjustments/saturation";
import { hueRotateAdjustmentDefinition } from "./adjustments/hue-rotate";
import { temperatureAdjustmentDefinition } from "./adjustments/temperature";
import { sepiaAdjustmentDefinition } from "./adjustments/sepia";
import { grayscaleAdjustmentDefinition } from "./adjustments/grayscale";
import { invertAdjustmentDefinition } from "./adjustments/invert";
import { highlightsAdjustmentDefinition } from "./adjustments/highlights";
import { shadowsAdjustmentDefinition } from "./adjustments/shadows";
import { sharpenAdjustmentDefinition } from "./adjustments/sharpen";
import { vibranceAdjustmentDefinition } from "./adjustments/vibrance";
import { vignetteAdjustmentDefinition } from "./adjustments/vignette";
import { grainAdjustmentDefinition } from "./adjustments/grain";
import { clarityAdjustmentDefinition } from "./adjustments/clarity";
import { dehazeAdjustmentDefinition } from "./adjustments/dehaze";
import { fadeAdjustmentDefinition } from "./adjustments/fade";
import { whitesAdjustmentDefinition } from "./adjustments/whites";
import { blacksAdjustmentDefinition } from "./adjustments/blacks";
import { colorWheelsAdjustmentDefinition } from "./adjustments/color-wheels";
import {
	hslAdjustmentDefinition,
	curvesAdjustmentDefinition,
	lutAdjustmentDefinition,
} from "./adjustments/color-grading";
import { chromaticAberrationEffectDefinition } from "./video/chromatic-aberration";
import { chromaKeyEffectDefinition } from "./video/chroma-key";
import { motionBlurEffectDefinition } from "./video/motion-blur";
import { waveEffectDefinition } from "./video/wave";
import { rippleEffectDefinition } from "./video/ripple";
import { pixelateEffectDefinition } from "./video/pixelate";
import { fisheyeEffectDefinition } from "./video/fisheye";
import { scanlinesEffectDefinition } from "./video/scanlines";
import { glowEffectDefinition } from "./video/glow";
import { embossEffectDefinition } from "./video/emboss";
import {
	cinematicPopEffectDefinition,
	matteFilmEffectDefinition,
	neonBoostEffectDefinition,
	dreamyBloomEffectDefinition,
	retroCrtEffectDefinition,
} from "./video/stylized-presets";
import {
	posterizeEffectDefinition,
	edgeDetectEffectDefinition,
	halftoneEffectDefinition,
	mirrorEffectDefinition,
	swirlEffectDefinition,
	bulgeEffectDefinition,
	twistEffectDefinition,
	thermalEffectDefinition,
} from "./video/stylize-distort";

const defaultEffects = [
	blurEffectDefinition,
	brightnessAdjustmentDefinition,
	contrastAdjustmentDefinition,
	saturationAdjustmentDefinition,
	hueRotateAdjustmentDefinition,
	temperatureAdjustmentDefinition,
	sepiaAdjustmentDefinition,
	grayscaleAdjustmentDefinition,
	invertAdjustmentDefinition,
	highlightsAdjustmentDefinition,
	shadowsAdjustmentDefinition,
	sharpenAdjustmentDefinition,
	vibranceAdjustmentDefinition,
	vignetteAdjustmentDefinition,
	grainAdjustmentDefinition,
	clarityAdjustmentDefinition,
	dehazeAdjustmentDefinition,
	fadeAdjustmentDefinition,
	whitesAdjustmentDefinition,
	blacksAdjustmentDefinition,
	colorWheelsAdjustmentDefinition,
	hslAdjustmentDefinition,
	curvesAdjustmentDefinition,
	lutAdjustmentDefinition,
	chromaticAberrationEffectDefinition,
	chromaKeyEffectDefinition,
	motionBlurEffectDefinition,
	waveEffectDefinition,
	rippleEffectDefinition,
	pixelateEffectDefinition,
	fisheyeEffectDefinition,
	scanlinesEffectDefinition,
	glowEffectDefinition,
	embossEffectDefinition,
	cinematicPopEffectDefinition,
	matteFilmEffectDefinition,
	neonBoostEffectDefinition,
	dreamyBloomEffectDefinition,
	retroCrtEffectDefinition,
	posterizeEffectDefinition,
	edgeDetectEffectDefinition,
	halftoneEffectDefinition,
	mirrorEffectDefinition,
	swirlEffectDefinition,
	bulgeEffectDefinition,
	twistEffectDefinition,
	thermalEffectDefinition,
];

export function registerDefaultEffects(): void {
	for (const definition of defaultEffects) {
		if (effectsRegistry.has(definition.type)) {
			continue;
		}
		effectsRegistry.register(definition.type, definition);
	}
}
