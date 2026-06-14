import type { TransitionDefinition } from "../types";

export const irisTransition: TransitionDefinition = {
	type: "iris",
	name: "Iris",
	keywords: ["iris", "circle", "wipe", "eye"],
	category: "wipe",
	defaultDuration: 800,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-iris-in{from{clip-path:circle(0% at 50% 50%);}to{clip-path:circle(100% at 50% 50%);}}`
			: `@keyframes transition-iris-out{from{clip-path:circle(100% at 50% 50%);}to{clip-path:circle(0% at 50% 50%);}}`,
	easing: "ease-in-out",
};
