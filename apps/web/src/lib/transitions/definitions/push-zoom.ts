import type { TransitionDefinition } from "../types";

export const pushZoomTransition: TransitionDefinition = {
	type: "push-zoom",
	name: "Push Zoom",
	keywords: ["push", "zoom", "scale", "energy"],
	category: "zoom",
	defaultDuration: 650,
	minDuration: 150,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-push-zoom-in{from{transform:scale(1.35) translateY(10%);filter:blur(8px);opacity:0;}to{transform:scale(1) translateY(0);filter:blur(0);opacity:1;}}`
			: `@keyframes transition-push-zoom-out{from{transform:scale(1) translateY(0);filter:blur(0);opacity:1;}to{transform:scale(1.35) translateY(-10%);filter:blur(8px);opacity:0;}}`,
	easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};
