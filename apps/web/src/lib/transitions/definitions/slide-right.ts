import type { TransitionDefinition } from "../types";

export const slideRightTransition: TransitionDefinition = {
	type: "slide-right",
	name: "Slide Right",
	keywords: ["slide", "right", "pan"],
	category: "slide",
	defaultDuration: 700,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-slide-right-${direction}{from{transform:translateX(${direction === "in" ? -100 : 0}%);}to{transform:translateX(${direction === "in" ? 0 : 100}%);}`,
	easing: "cubic-bezier(0.4, 0, 0.2, 1)",
};
