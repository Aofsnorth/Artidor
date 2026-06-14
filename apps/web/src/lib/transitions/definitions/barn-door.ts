import type { TransitionDefinition } from "../types";

export const barnDoorTransition: TransitionDefinition = {
	type: "barn-door",
	name: "Barn Door",
	keywords: ["barn", "door", "split", "horizontal"],
	category: "wipe",
	defaultDuration: 700,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-barn-door-in{from{clip-path:inset(0 50% 0 50%);}to{clip-path:inset(0 0 0 0);}}`
			: `@keyframes transition-barn-door-out{from{clip-path:inset(0 0 0 0);}to{clip-path:inset(0 50% 0 50%);}}`,
	easing: "ease-in-out",
};
