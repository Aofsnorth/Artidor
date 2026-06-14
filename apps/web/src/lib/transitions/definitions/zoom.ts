import type { TransitionDefinition } from "../types";

export const zoomTransition: TransitionDefinition = {
	type: "zoom",
	name: "Zoom",
	keywords: ["zoom", "scale", "magnify"],
	category: "zoom",
	defaultDuration: 600,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-zoom-${direction}{from{transform:scale(${direction === "in" ? 0.5 : 1});opacity:${direction === "in" ? 0 : 1};}to{transform:scale(${direction === "in" ? 1 : 1.5});opacity:${direction === "in" ? 1 : 0};}`,
	easing: "ease-out",
};
