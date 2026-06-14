import type { TransitionDefinition } from "../types";

export const fadeToBlackTransition: TransitionDefinition = {
	type: "fade-to-black",
	name: "Fade to Black",
	keywords: ["fade", "black", "transition", "cut"],
	category: "fade",
	defaultDuration: 800,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-fade-to-black{0%{opacity:1;}50%{opacity:0;background:#000;}100%{opacity:1;}}`,
	easing: "ease-in-out",
};
