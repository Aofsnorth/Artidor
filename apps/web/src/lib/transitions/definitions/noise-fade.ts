import type { TransitionDefinition } from "../types";

export const noiseFadeTransition: TransitionDefinition = {
	type: "noise-fade",
	name: "Noise Fade",
	keywords: ["noise", "fade", "grain", "film"],
	category: "glitch",
	defaultDuration: 600,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-noise-fade{0%{filter:contrast(1) brightness(1);opacity:1;}25%{filter:contrast(1.5) brightness(1.4);opacity:0.8;}50%{filter:contrast(2) brightness(0.6);opacity:0.3;}75%{filter:contrast(1.5) brightness(1.3);opacity:0.7;}100%{filter:contrast(1) brightness(1);opacity:1;}}`,
	easing: "steps(8,end)",
};
