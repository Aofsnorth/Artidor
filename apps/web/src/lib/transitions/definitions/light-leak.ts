import type { TransitionDefinition } from "../types";

export const lightLeakTransition: TransitionDefinition = {
	type: "light-leak",
	name: "Light Leak",
	keywords: ["light", "leak", "warm", "film"],
	category: "fade",
	defaultDuration: 700,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-light-leak{0%{opacity:1;background:transparent;}30%{opacity:0.3;}50%{opacity:0;background:radial-gradient(circle,rgba(255,180,80,0.9),rgba(255,80,40,0.4) 60%,transparent 80%);}70%{opacity:0.4;}100%{opacity:1;background:transparent;}}`,
	easing: "ease-in-out",
};
