import type { TransitionDefinition } from "../types";

export const apertureTransition: TransitionDefinition = {
	type: "aperture",
	name: "Aperture",
	keywords: ["aperture", "lens", "open", "close", "circle"],
	category: "wipe",
	defaultDuration: 700,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-aperture-${direction}{0%{clip-path:polygon(50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%);}100%{clip-path:polygon(50% 0,100% 18%,100% 82%,50% 100%,0 82%,0 18%);}}`,
	easing: "cubic-bezier(0.4,0,0.2,1)",
};
