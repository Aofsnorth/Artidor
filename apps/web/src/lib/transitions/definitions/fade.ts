import type { TransitionDefinition } from "../types";

export const fadeTransition: TransitionDefinition = {
	type: "fade",
	name: "Fade",
	keywords: ["fade", "dissolve", "opacity"],
	category: "fade",
	defaultDuration: 500,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-fade-${direction}{from{opacity:${direction === "in" ? 0 : 1};}to{opacity:${direction === "in" ? 1 : 0};}}`,
	easing: "ease-in-out",
};
