import type { TransitionDefinition } from "../types";

export const flipHorizontalTransition: TransitionDefinition = {
	type: "flip-horizontal",
	name: "Flip Horizontal",
	keywords: ["flip", "horizontal", "3d", "card"],
	category: "slide",
	defaultDuration: 800,
	minDuration: 200,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-flip-horizontal-in{from{transform:perspective(1000px) rotateY(90deg);opacity:0;}to{transform:perspective(1000px) rotateY(0deg);opacity:1;}}`
			: `@keyframes transition-flip-horizontal-out{from{transform:perspective(1000px) rotateY(0deg);opacity:1;}to{transform:perspective(1000px) rotateY(-90deg);opacity:0;}}`,
	easing: "ease-in-out",
};
