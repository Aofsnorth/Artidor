import type { TransitionDefinition } from "../types";

export const slideUpTransition: TransitionDefinition = {
	type: "slide-up",
	name: "Slide Up",
	keywords: ["slide", "up", "pan"],
	category: "slide",
	defaultDuration: 700,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-slide-up-${direction}{from{transform:translateY(${direction === "in" ? 100 : 0}%);}to{transform:translateY(${direction === "in" ? 0 : -100}%);}`,
	easing: "cubic-bezier(0.4, 0, 0.2, 1)",
};
