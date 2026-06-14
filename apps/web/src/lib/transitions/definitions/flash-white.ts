import type { TransitionDefinition } from "../types";

export const flashWhiteTransition: TransitionDefinition = {
	type: "flash-white",
	name: "Flash White",
	keywords: ["flash", "white", "strobe", "transition"],
	category: "fade",
	defaultDuration: 400,
	minDuration: 100,
	maxDuration: 2000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-flash-white{0%{opacity:1;}50%{opacity:1;background:#fff;filter:brightness(2);}100%{opacity:1;}}`,
	easing: "ease-out",
};
