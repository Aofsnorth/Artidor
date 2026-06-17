import type { TransitionDefinition } from "../types";

export const whipPanTransition: TransitionDefinition = {
	type: "whip-pan",
	name: "Whip Pan",
	keywords: ["whip", "pan", "fast", "blur"],
	category: "slide",
	defaultDuration: 320,
	minDuration: 100,
	maxDuration: 1000,
	directions: ["cross"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-whip-pan-${direction}{0%{transform:translateX(0) scaleX(1);filter:blur(0px);}40%{transform:translateX(${direction === "in" ? 100 : -100}%) scaleX(1.4);filter:blur(8px);}60%{transform:translateX(${direction === "in" ? -100 : 100}%) scaleX(1.4);filter:blur(8px);}100%{transform:translateX(0) scaleX(1);filter:blur(0px);}}`,
	easing: "cubic-bezier(0.65,0,0.35,1)",
};
