import type { TransitionDefinition } from "../types";

export const slideDownTransition: TransitionDefinition = {
	type: "slide-down",
	name: "Slide Down",
	keywords: ["slide", "down", "wipe", "push"],
	category: "slide",
	defaultDuration: 600,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-slide-down-${direction}{from{transform:translateY(${direction === "in" ? -100 : 0}%);}to{transform:translateY(${direction === "in" ? 0 : 100}%);}}`,
	easing: "ease-in-out",
};
