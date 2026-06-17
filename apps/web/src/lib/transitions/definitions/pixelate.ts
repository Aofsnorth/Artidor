import type { TransitionDefinition } from "../types";

export const pixelateTransition: TransitionDefinition = {
	type: "pixelate",
	name: "Pixelate",
	keywords: ["pixelate", "mosaic", "block"],
	category: "glitch",
	defaultDuration: 500,
	minDuration: 150,
	maxDuration: 1500,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-pixelate{0%{filter:pixelate(0px);opacity:1;}50%{filter:pixelate(20px);opacity:0.6;}100%{filter:pixelate(0px);opacity:1;}}`,
	easing: "steps(6,end)",
};
