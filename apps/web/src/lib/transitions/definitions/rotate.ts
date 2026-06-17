import type { TransitionDefinition } from "../types";

export const rotateTransition: TransitionDefinition = {
	type: "rotate",
	name: "Rotate",
	keywords: ["rotate", "spin", "turn"],
	category: "zoom",
	defaultDuration: 600,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-rotate-${direction}{0%{transform:rotate(${direction === "in" ? -180 : 0}deg) scale(${direction === "in" ? 0 : 1});opacity:${direction === "in" ? 0 : 1};}100%{transform:rotate(0deg) scale(1);opacity:1;}}`,
	easing: "ease-in-out",
};
