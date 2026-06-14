import type { TransitionDefinition } from "../types";

export const blindsTransition: TransitionDefinition = {
	type: "blinds",
	name: "Vertical Blinds",
	keywords: ["blinds", "venetian", "shutter", "vertical"],
	category: "wipe",
	defaultDuration: 800,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-blinds-in{from{clip-path:inset(0 100% 0 0);}to{clip-path:inset(0 0 0 0);}}`
			: `@keyframes transition-blinds-out{from{clip-path:inset(0 0 0 0);}to{clip-path:inset(0 100% 0 0);}}`,
	easing: "ease-in-out",
};
