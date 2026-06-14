import type { TransitionDefinition } from "../types";

export const dipToBlackTransition: TransitionDefinition = {
	type: "dip-to-black",
	name: "Dip to Black",
	keywords: ["dip", "black", "fade", "cut"],
	category: "fade",
	defaultDuration: 1000,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-dip-to-black{0%{opacity:1;}50%{opacity:0;background:#000;}100%{opacity:1;}}`,
	easing: "ease-in-out",
};
