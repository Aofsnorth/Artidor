import type { TransitionDefinition } from "../types";

export const shutterTransition: TransitionDefinition = {
	type: "shutter",
	name: "Shutter",
	keywords: ["shutter", "lens", "close", "open"],
	category: "wipe",
	defaultDuration: 500,
	minDuration: 100,
	maxDuration: 1500,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-shutter-${direction}{0%{clip-path:polygon(0 0,100% 0,100% 0,0 0);}50%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%);}100%{clip-path:polygon(0 ${direction === "in" ? "0" : "100%"},100% ${direction === "in" ? "0" : "100%"},100% ${direction === "in" ? "100%" : "0"},0 ${direction === "in" ? "100%" : "0"});}}`,
	easing: "cubic-bezier(0.7,0,0.3,1)",
};
