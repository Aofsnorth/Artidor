import type { TransitionDefinition } from "../types";

export const flipVerticalTransition: TransitionDefinition = {
	type: "flip-vertical",
	name: "Flip Vertical",
	keywords: ["flip", "vertical", "3d", "rotate"],
	category: "zoom",
	defaultDuration: 600,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-flip-vertical-${direction}{0%{transform:rotateY(${direction === "in" ? 90 : 0}deg);opacity:${direction === "in" ? 0 : 1};}100%{transform:rotateY(0deg);opacity:1;}}`,
	easing: "ease-in-out",
};
