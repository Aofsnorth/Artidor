import type { TransitionDefinition } from "../types";

export const wipeClockTransition: TransitionDefinition = {
	type: "wipe-clock",
	name: "Wipe Clock",
	keywords: ["wipe", "clock", "radial", "sweep", "circle"],
	category: "wipe",
	defaultDuration: 800,
	minDuration: 100,
	maxDuration: 4000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-wipe-clock-in{0%{clip-path:polygon(50% 50%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%);}25%{clip-path:polygon(50% 50%, 50% 0%, 100% 0%, 100% 0%, 100% 0%, 100% 0%);}50%{clip-path:polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 100% 100%, 100% 100%);}75%{clip-path:polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 100%);}100%{clip-path:polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%);}}`
			: `@keyframes transition-wipe-clock-out{0%{clip-path:polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%);}25%{clip-path:polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 100%, 0% 100%);}50%{clip-path:polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 100% 100%, 100% 100%, 100% 100%);}75%{clip-path:polygon(50% 50%, 50% 0%, 100% 0%, 100% 0%, 100% 0%, 100% 0%, 100% 0%);}100%{clip-path:polygon(50% 50%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%, 50% 0%);}}`,
	easing: "linear",
};
