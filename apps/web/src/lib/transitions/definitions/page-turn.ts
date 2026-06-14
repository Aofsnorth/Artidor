import type { TransitionDefinition } from "../types";

export const pageTurnTransition: TransitionDefinition = {
	type: "page-turn",
	name: "Page Turn",
	keywords: ["page", "turn", "flip", "book", "paper"],
	category: "slide",
	defaultDuration: 900,
	minDuration: 200,
	maxDuration: 4000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-page-turn-in{0%{transform:perspective(1200px) rotateY(-90deg);transform-origin:left center;opacity:0;}100%{transform:perspective(1200px) rotateY(0deg);transform-origin:left center;opacity:1;}}`
			: `@keyframes transition-page-turn-out{0%{transform:perspective(1200px) rotateY(0deg);transform-origin:left center;opacity:1;}100%{transform:perspective(1200px) rotateY(90deg);transform-origin:left center;opacity:0;}}`,
	easing: "ease-in-out",
};
