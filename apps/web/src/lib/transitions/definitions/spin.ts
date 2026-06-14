import type { TransitionDefinition } from "../types";

export const spinTransition: TransitionDefinition = {
	type: "spin",
	name: "Spin",
	keywords: ["spin", "rotate", "3d", "turn"],
	category: "slide",
	defaultDuration: 900,
	minDuration: 200,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-spin-in{from{transform:rotate(-180deg) scale(0.5);opacity:0;}to{transform:rotate(0deg) scale(1);opacity:1;}}`
			: `@keyframes transition-spin-out{from{transform:rotate(0deg) scale(1);opacity:1;}to{transform:rotate(180deg) scale(0.5);opacity:0;}}`,
	easing: "ease-in-out",
};
