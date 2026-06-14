import type { TransitionDefinition } from "../types";

export const wipeDownTransition: TransitionDefinition = {
	type: "wipe-down",
	name: "Wipe Down",
	keywords: ["wipe", "down", "slide"],
	category: "wipe",
	defaultDuration: 600,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-wipe-down-${direction}{from{clip-path:inset(0 0 ${direction === "in" ? 100 : 0}% 0);}to{clip-path:inset(0 0 ${direction === "in" ? 0 : 100}% 0);}}`,
	easing: "ease-in-out",
};
