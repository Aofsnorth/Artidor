import type { TransitionDefinition } from "../types";

export const fadeToWhiteTransition: TransitionDefinition = {
	type: "fade-to-white",
	name: "Fade to White",
	keywords: ["fade", "white", "transition", "cut"],
	category: "fade",
	defaultDuration: 800,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-fade-to-white{0%{opacity:1;}50%{opacity:0;background:#fff;}100%{opacity:1;}}`,
	easing: "ease-in-out",
};
