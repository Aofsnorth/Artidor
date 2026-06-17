import type { TransitionDefinition } from "../types";

export const diagonalWipeTransition: TransitionDefinition = {
	type: "diagonal-wipe",
	name: "Diagonal Wipe",
	keywords: ["diagonal", "wipe", "slash"],
	category: "wipe",
	defaultDuration: 500,
	minDuration: 200,
	maxDuration: 1500,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-diagonal-wipe-${direction}{0%{clip-path:polygon(0 0,0 0,0 100%);}100%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%);}}`,
	easing: "ease-in-out",
};
