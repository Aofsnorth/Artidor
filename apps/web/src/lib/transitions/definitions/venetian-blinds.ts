import type { TransitionDefinition } from "../types";

export const venetianBlindsTransition: TransitionDefinition = {
	type: "venetian-blinds",
	name: "Venetian Blinds",
	keywords: ["venetian", "blinds", "slats"],
	category: "wipe",
	defaultDuration: 700,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-venetian-blinds-${direction}{0%{background:repeating-linear-gradient(0deg,transparent 0 19%,#000 19% 20%);background-size:100% 0%;}100%{background-size:100% 100%;}}`,
	easing: "ease-in-out",
};
