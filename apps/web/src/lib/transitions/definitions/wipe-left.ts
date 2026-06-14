import type { TransitionDefinition } from "../types";

export const wipeLeftTransition: TransitionDefinition = {
	type: "wipe-left",
	name: "Wipe Left",
	keywords: ["wipe", "left", "slide"],
	category: "wipe",
	defaultDuration: 600,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-wipe-left-${direction}{from{clip-path:inset(0 ${direction === "in" ? 100 : 0}% 0 0);}to{clip-path:inset(0 ${direction === "in" ? 0 : 100}% 0 0);}}`,
	easing: "ease-in-out",
};
