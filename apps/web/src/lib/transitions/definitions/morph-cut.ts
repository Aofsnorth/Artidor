import type { TransitionDefinition } from "../types";

export const morphCutTransition: TransitionDefinition = {
	type: "morph-cut",
	name: "Morph Cut",
	keywords: ["morph", "cut", "smooth", "interview"],
	category: "fade",
	defaultDuration: 600,
	minDuration: 100,
	maxDuration: 2000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-morph-cut{0%{opacity:1;filter:blur(0px);}30%{opacity:0.6;filter:blur(2px);}50%{opacity:0;filter:blur(6px);}70%{opacity:0.6;filter:blur(2px);}100%{opacity:1;filter:blur(0px);}}`,
	easing: "ease-in-out",
};
