import type { TransitionDefinition } from "../types";

export const cubeRotateTransition: TransitionDefinition = {
	type: "cube-rotate",
	name: "Cube Rotate",
	keywords: ["3d", "cube", "rotate", "perspective", "turn", "spin"],
	category: "slide",
	defaultDuration: 1000,
	minDuration: 200,
	maxDuration: 4000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-cube-rotate-in{0%{transform:perspective(1000px) rotateY(90deg) translateZ(100px);opacity:0;}100%{transform:perspective(1000px) rotateY(0deg) translateZ(0);opacity:1;}}`
			: `@keyframes transition-cube-rotate-out{0%{transform:perspective(1000px) rotateY(0deg) translateZ(0);opacity:1;}100%{transform:perspective(1000px) rotateY(-90deg) translateZ(100px);opacity:0;}}`,
	easing: "ease-in-out",
};
