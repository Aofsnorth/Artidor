import type { TransitionDefinition } from "../types";

export const splitSlideTransition: TransitionDefinition = {
	type: "split-slide",
	name: "Split Slide",
	keywords: ["split", "slide", "door", "panels"],
	category: "slide",
	defaultDuration: 700,
	minDuration: 200,
	maxDuration: 3000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-split-slide{0%{clip-path:polygon(0 0,50% 0,50% 100%,0 100%);transform:translateX(-16%);}50%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%);transform:translateX(0);}100%{clip-path:polygon(50% 0,100% 0,100% 100%,50% 100%);transform:translateX(16%);}}`,
	easing: "cubic-bezier(0.4, 0, 0.2, 1)",
};
