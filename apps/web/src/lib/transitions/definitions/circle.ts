import type { TransitionDefinition } from "../types";

export const circleTransition: TransitionDefinition = {
	type: "circle",
	name: "Circle Wipe",
	keywords: ["shape", "circle", "wipe"],
	category: "wipe",
	defaultDuration: 800,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-circle-${direction}{from{clip-path:circle(${direction === "in" ? 0 : 100}% at 50% 50%);}to{clip-path:circle(${direction === "in" ? 100 : 0}% at 50% 50%);}}`,
	easing: "ease-in-out",
};
