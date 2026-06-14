import type { TransitionDefinition } from "../types";

export const checkerWipeTransition: TransitionDefinition = {
	type: "checker-wipe",
	name: "Checker Wipe",
	keywords: ["checker", "wipe", "block", "grid", "tile"],
	category: "wipe",
	defaultDuration: 800,
	minDuration: 100,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-checker-wipe-in{0%{clip-path:polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%);}25%{clip-path:polygon(0% 0%, 50% 0%, 50% 50%, 0% 50%);}50%{clip-path:polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%);}75%{clip-path:polygon(0% 50%, 50% 50%, 50% 100%, 0% 100%);}100%{clip-path:polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%, 100% 100%, 100% 100%, 0% 100%, 0% 50%, 0% 0%, 0% 0%);}}`
			: `@keyframes transition-checker-wipe-out{0%{clip-path:polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%, 100% 100%, 100% 100%, 0% 100%, 0% 50%, 0% 0%, 0% 0%);}25%{clip-path:polygon(0% 50%, 50% 50%, 50% 100%, 0% 100%);}50%{clip-path:polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%);}75%{clip-path:polygon(0% 0%, 50% 0%, 50% 50%, 0% 50%);}100%{clip-path:polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%);}}`,
	easing: "ease-in-out",
};
