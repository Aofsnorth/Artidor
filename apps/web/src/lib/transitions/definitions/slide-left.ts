import type { TransitionDefinition } from "../types";

export const slideLeftTransition: TransitionDefinition = {
	type: "slide-left",
	name: "Slide Left",
	keywords: ["slide", "left", "pan"],
	category: "slide",
	defaultDuration: 700,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-slide-left-${direction}{from{transform:translateX(${direction === "in" ? 100 : 0}%);}to{transform:translateX(${direction === "in" ? 0 : -100}%);}`,
	easing: "cubic-bezier(0.4, 0, 0.2, 1)",
};
