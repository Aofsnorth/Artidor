import type { TransitionDefinition } from "../types";

export const bounceTransition: TransitionDefinition = {
	type: "bounce",
	name: "Bounce",
	keywords: ["bounce", "elastic", "bouncy"],
	category: "zoom",
	defaultDuration: 700,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-bounce-${direction}{0%{transform:scale(${direction === "in" ? 0 : 1});opacity:${direction === "in" ? 0 : 1};}30%{transform:scale(${direction === "in" ? 1.2 : 0.8});}60%{transform:scale(${direction === "in" ? 0.9 : 1.1});opacity:1;}100%{transform:scale(1);opacity:1;}}`,
	easing: "cubic-bezier(0.68,-0.55,0.27,1.55)",
};
