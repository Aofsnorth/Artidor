import { transitionsRegistry } from "./registry";
import { fadeTransition } from "./definitions/fade";
import { crossDissolveTransition } from "./definitions/cross-dissolve";
import { dipToBlackTransition } from "./definitions/dip-to-black";
import { wipeLeftTransition } from "./definitions/wipe-left";
import { wipeRightTransition } from "./definitions/wipe-right";
import { slideLeftTransition } from "./definitions/slide-left";
import { slideUpTransition } from "./definitions/slide-up";
import { zoomTransition } from "./definitions/zoom";
import { glitchTransition } from "./definitions/glitch";
import { wipeClockTransition } from "./definitions/wipe-clock";
import { cubeRotateTransition } from "./definitions/cube-rotate";
import { wipeDownTransition } from "./definitions/wipe-down";
import { slideDownTransition } from "./definitions/slide-down";
import { wipeUpTransition } from "./definitions/wipe-up";
import { slideRightTransition } from "./definitions/slide-right";
import { circleTransition } from "./definitions/circle";
import { barnDoorTransition } from "./definitions/barn-door";
import { irisTransition } from "./definitions/iris";
import { blindsTransition } from "./definitions/blinds";
import { pageTurnTransition } from "./definitions/page-turn";
import { fadeToBlackTransition } from "./definitions/fade-to-black";
import { fadeToWhiteTransition } from "./definitions/fade-to-white";
import { checkerWipeTransition } from "./definitions/checker-wipe";
import { flashWhiteTransition } from "./definitions/flash-white";
import { flipHorizontalTransition } from "./definitions/flip-horizontal";
import { spinTransition } from "./definitions/spin";
import { mosaicTransition } from "./definitions/mosaic";
import { paintSplashTransition } from "./definitions/paint-splash";
import { pushZoomTransition } from "./definitions/push-zoom";
import { splitSlideTransition } from "./definitions/split-slide";
import { colorSweepTransition } from "./definitions/color-sweep";
import { chromaPopTransition } from "./definitions/chroma-pop";
import { morphCutTransition } from "./definitions/morph-cut";
import { whipPanTransition } from "./definitions/whip-pan";
import { shutterTransition } from "./definitions/shutter";
import { lightLeakTransition } from "./definitions/light-leak";
import { rotateTransition } from "./definitions/rotate";
import { skewTransition } from "./definitions/skew";
import { diagonalWipeTransition } from "./definitions/diagonal-wipe";
import { venetianBlindsTransition } from "./definitions/venetian-blinds";
import { rgbSplitTransition } from "./definitions/rgb-split";
import { pixelateTransition } from "./definitions/pixelate";
import { stretchTransition } from "./definitions/stretch";
import { zoomBlurTransition } from "./definitions/zoom-blur";
import { radialWipeTransition } from "./definitions/radial-wipe";
import { curtainTransition } from "./definitions/curtain";
import { bounceTransition } from "./definitions/bounce";
import { apertureTransition } from "./definitions/aperture";
import { flipVerticalTransition } from "./definitions/flip-vertical";
import { noiseFadeTransition } from "./definitions/noise-fade";
import { rippleTransition } from "./definitions/ripple";
import { kaleidoscopeTransition } from "./definitions/kaleidoscope";

const defaultTransitions = [
	fadeTransition,
	crossDissolveTransition,
	dipToBlackTransition,
	wipeLeftTransition,
	wipeRightTransition,
	slideLeftTransition,
	slideUpTransition,
	zoomTransition,
	glitchTransition,
	wipeClockTransition,
	cubeRotateTransition,
	wipeDownTransition,
	slideDownTransition,
	wipeUpTransition,
	slideRightTransition,
	circleTransition,
	barnDoorTransition,
	irisTransition,
	blindsTransition,
	pageTurnTransition,
	fadeToBlackTransition,
	fadeToWhiteTransition,
	checkerWipeTransition,
	flashWhiteTransition,
	flipHorizontalTransition,
	spinTransition,
	mosaicTransition,
	paintSplashTransition,
	pushZoomTransition,
	splitSlideTransition,
	colorSweepTransition,
	chromaPopTransition,
	morphCutTransition,
	whipPanTransition,
	shutterTransition,
	lightLeakTransition,
	rotateTransition,
	skewTransition,
	diagonalWipeTransition,
	venetianBlindsTransition,
	rgbSplitTransition,
	pixelateTransition,
	stretchTransition,
	zoomBlurTransition,
	radialWipeTransition,
	curtainTransition,
	bounceTransition,
	apertureTransition,
	flipVerticalTransition,
	noiseFadeTransition,
	rippleTransition,
	kaleidoscopeTransition,
];

export function registerDefaultTransitions(): void {
	for (const definition of defaultTransitions) {
		if (transitionsRegistry.has(definition.type)) {
			continue;
		}
		transitionsRegistry.register(definition.type, definition);
	}
}

export { transitionsRegistry } from "./registry";
export type {
	TransitionDefinition,
	TransitionParams,
	TransitionCategory,
	TransitionDirection,
} from "./types";
