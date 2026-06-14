import type { TransitionDefinition } from "../types";

export const glitchTransition: TransitionDefinition = {
	type: "glitch",
	name: "Glitch",
	keywords: ["glitch", "rgb", "distort", "shake"],
	category: "glitch",
	defaultDuration: 400,
	minDuration: 100,
	maxDuration: 2000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-glitch{0%{transform:translate(0);filter:hue-rotate(0deg);}20%{transform:translate(-3px,2px);filter:hue-rotate(90deg);}40%{transform:translate(2px,-2px);filter:hue-rotate(180deg);}60%{transform:translate(-2px,1px);filter:hue-rotate(270deg);}80%{transform:translate(3px,-1px);filter:hue-rotate(360deg);}100%{transform:translate(0);filter:hue-rotate(0deg);}}`,
	easing: "steps(5,end)",
};
