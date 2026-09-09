import type { TransitionDefinition } from "../types";

// Blur transition ported from DonkeyCut (Apache 2.0): a defocus crossfade
// where the blur peaks mid-transition on both sides of the cut, then
// resolves into the incoming clip.
export const blurTransition: TransitionDefinition = {
	type: "blur",
	name: "Blur",
	keywords: ["blur", "defocus", "soft", "crossfade", "transition", "cut"],
	category: "fade",
	defaultDuration: 500,
	minDuration: 100,
	maxDuration: 2000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-blur{0%{filter:blur(0px);opacity:1;}50%{filter:blur(14px);opacity:0.5;}100%{filter:blur(0px);opacity:0;}}`,
	easing: "ease-in-out",
};
