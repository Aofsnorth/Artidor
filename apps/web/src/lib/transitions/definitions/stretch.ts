import type { TransitionDefinition } from "../types";

export const stretchTransition: TransitionDefinition = {
	type: "stretch",
	name: "Stretch",
	keywords: ["stretch", "elastic", "warp"],
	category: "zoom",
	defaultDuration: 600,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-stretch-${direction}{0%{transform:scaleX(${direction === "in" ? 0 : 1}) scaleY(${direction === "in" ? 3 : 1});opacity:${direction === "in" ? 0 : 1};}50%{transform:scaleX(1.2) scaleY(0.8);}100%{transform:scaleX(1) scaleY(1);opacity:1;}}`,
	easing: "cubic-bezier(0.68,-0.55,0.27,1.55)",
};
