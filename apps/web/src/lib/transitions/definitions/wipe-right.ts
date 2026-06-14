import type { TransitionDefinition } from "../types";

export const wipeRightTransition: TransitionDefinition = {
	type: "wipe-right",
	name: "Wipe Right",
	keywords: ["wipe", "right", "slide"],
	category: "wipe",
	defaultDuration: 600,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-wipe-right-${direction}{from{clip-path:inset(0 0 0 ${direction === "in" ? 100 : 0}%);}to{clip-path:inset(0 0 0 ${direction === "in" ? 0 : 100}%);}}`,
	easing: "ease-in-out",
};
