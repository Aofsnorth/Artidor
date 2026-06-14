import type { TransitionDefinition } from "../types";

export const wipeUpTransition: TransitionDefinition = {
	type: "wipe-up",
	name: "Wipe Up",
	keywords: ["wipe", "up", "slide"],
	category: "wipe",
	defaultDuration: 600,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-wipe-up-${direction}{from{clip-path:inset(${direction === "in" ? 100 : 0}% 0 0 0);}to{clip-path:inset(${direction === "in" ? 0 : 100}% 0 0 0);}}`,
	easing: "ease-in-out",
};
