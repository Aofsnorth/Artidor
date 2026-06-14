import type { TransitionDefinition } from "../types";

export const colorSweepTransition: TransitionDefinition = {
	type: "color-sweep",
	name: "Color Sweep",
	keywords: ["color", "sweep", "wipe", "gradient"],
	category: "wipe",
	defaultDuration: 600,
	minDuration: 150,
	maxDuration: 2400,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-color-sweep-${direction}{0%{clip-path:inset(0 ${direction === "in" ? 100 : 0}% 0 0);filter:saturate(1.8) hue-rotate(0deg);}50%{filter:saturate(2.2) hue-rotate(90deg);}100%{clip-path:inset(0 ${direction === "in" ? 0 : 100}% 0 0);filter:saturate(1) hue-rotate(0deg);}}`,
	easing: "ease-in-out",
};
