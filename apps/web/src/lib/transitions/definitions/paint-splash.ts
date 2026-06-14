import type { TransitionDefinition } from "../types";

export const paintSplashTransition: TransitionDefinition = {
	type: "paint-splash",
	name: "Paint Splash",
	keywords: ["paint", "splash", "ink", "watercolor", "artistic"],
	category: "glitch",
	defaultDuration: 800,
	minDuration: 200,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-paint-splash-in{0%{transform:scale(0);filter:blur(20px) hue-rotate(0deg);opacity:0;}50%{transform:scale(1.2);filter:blur(5px) hue-rotate(180deg);opacity:0.8;}100%{transform:scale(1);filter:blur(0) hue-rotate(360deg);opacity:1;}}`
			: `@keyframes transition-paint-splash-out{0%{transform:scale(1);filter:blur(0);opacity:1;}50%{transform:scale(1.2);filter:blur(5px) hue-rotate(180deg);opacity:0.8;}100%{transform:scale(0);filter:blur(20px);opacity:0;}}`,
	easing: "ease-in-out",
};
