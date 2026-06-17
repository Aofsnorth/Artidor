import type { TransitionDefinition } from "../types";

export const rgbSplitTransition: TransitionDefinition = {
	type: "rgb-split",
	name: "RGB Split",
	keywords: ["rgb", "split", "chromatic", "glitch"],
	category: "glitch",
	defaultDuration: 500,
	minDuration: 150,
	maxDuration: 1500,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-rgb-split{0%{text-shadow:0 0 transparent;filter:drop-shadow(0 0 transparent);}25%{text-shadow:-4px 0 #ff0040,4px 0 #00d9ff;filter:drop-shadow(-4px 0 #ff0040) drop-shadow(4px 0 #00d9ff);}50%{text-shadow:5px 0 #ff0040,-5px 0 #00d9ff;filter:drop-shadow(5px 0 #ff0040) drop-shadow(-5px 0 #00d9ff);}75%{text-shadow:-3px 0 #ff0040,3px 0 #00d9ff;filter:drop-shadow(-3px 0 #ff0040) drop-shadow(3px 0 #00d9ff);}100%{text-shadow:0 0 transparent;filter:drop-shadow(0 0 transparent);}}`,
	easing: "steps(4,end)",
};
