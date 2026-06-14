import type { TransitionDefinition } from "../types";

export const crossDissolveTransition: TransitionDefinition = {
	type: "cross-dissolve",
	name: "Cross Dissolve",
	keywords: ["cross", "dissolve", "blend", "opacity"],
	category: "fade",
	defaultDuration: 800,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-cross-dissolve{0%{opacity:0;}50%{opacity:0.5;}100%{opacity:1;}}`,
	easing: "ease-in-out",
};
