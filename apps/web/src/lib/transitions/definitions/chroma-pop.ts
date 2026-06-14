import type { TransitionDefinition } from "../types";

export const chromaPopTransition: TransitionDefinition = {
	type: "chroma-pop",
	name: "Chroma Pop",
	keywords: ["chroma", "rgb", "pop", "glitch"],
	category: "glitch",
	defaultDuration: 450,
	minDuration: 100,
	maxDuration: 1600,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-chroma-pop{0%{transform:scale(0.96);filter:contrast(1) saturate(1);}25%{transform:translate(-3px,2px) scale(1.03);filter:contrast(1.8) saturate(2) hue-rotate(40deg);}50%{transform:translate(2px,-2px) scale(0.98);filter:contrast(1.5) saturate(2.4) hue-rotate(160deg);}75%{transform:translate(-1px,1px) scale(1.02);filter:contrast(1.7) saturate(1.8) hue-rotate(260deg);}100%{transform:scale(1);filter:contrast(1) saturate(1);}}`,
	easing: "steps(4,end)",
};
