import type { TransitionDefinition } from "../types";

export const rippleTransition: TransitionDefinition = {
	type: "ripple",
	name: "Ripple",
	keywords: ["ripple", "water", "wave"],
	category: "glitch",
	defaultDuration: 700,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-ripple{0%{filter:url(#ripple-0);opacity:1;}50%{filter:url(#ripple-1);opacity:0.7;}100%{filter:url(#ripple-0);opacity:1;}}`,
	easing: "ease-in-out",
};
