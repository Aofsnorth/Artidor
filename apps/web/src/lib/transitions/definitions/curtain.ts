import type { TransitionDefinition } from "../types";

export const curtainTransition: TransitionDefinition = {
	type: "curtain",
	name: "Curtain",
	keywords: ["curtain", "theater", "close", "open"],
	category: "wipe",
	defaultDuration: 700,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-curtain-${direction}{0%{background:linear-gradient(90deg,transparent 48%,#000 48% 52%,transparent 52%);background-size:200% 100%;background-position:${direction === "in" ? "100% 0" : "0 0"};}100%{background-position:${direction === "in" ? "0 0" : "100% 0"};}}`,
	easing: "ease-in-out",
};
