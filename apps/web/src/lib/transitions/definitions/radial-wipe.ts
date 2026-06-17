import type { TransitionDefinition } from "../types";

export const radialWipeTransition: TransitionDefinition = {
	type: "radial-wipe",
	name: "Radial Wipe",
	keywords: ["radial", "wipe", "circle", "sweep"],
	category: "wipe",
	defaultDuration: 600,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-radial-wipe-${direction}{0%{clip-path:circle(${direction === "in" ? "0%" : "150%"} at 50% 50%);}100%{clip-path:circle(${direction === "in" ? "150%" : "0%"} at 50% 50%);}}`,
	easing: "cubic-bezier(0.65,0,0.35,1)",
};
