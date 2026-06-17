import type { TransitionDefinition } from "../types";

export const kaleidoscopeTransition: TransitionDefinition = {
	type: "kaleidoscope",
	name: "Kaleidoscope",
	keywords: ["kaleidoscope", "mirror", "fractal"],
	category: "glitch",
	defaultDuration: 800,
	minDuration: 300,
	maxDuration: 2500,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-kaleidoscope{0%{transform:scale(1) rotate(0deg);filter:hue-rotate(0deg) saturate(1);}33%{transform:scale(0.8) rotate(60deg);filter:hue-rotate(120deg) saturate(1.5);}66%{transform:scale(0.9) rotate(-60deg);filter:hue-rotate(240deg) saturate(1.8);}100%{transform:scale(1) rotate(0deg);filter:hue-rotate(0deg) saturate(1);}}`,
	easing: "ease-in-out",
};
