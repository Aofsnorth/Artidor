import type { TransitionDefinition } from "../types";

export const zoomBlurTransition: TransitionDefinition = {
	type: "zoom-blur",
	name: "Zoom Blur",
	keywords: ["zoom", "blur", "radial"],
	category: "zoom",
	defaultDuration: 600,
	minDuration: 200,
	maxDuration: 2000,
	directions: ["cross"],
	previewStyle: () =>
		`@keyframes transition-zoom-blur{0%{transform:scale(1);filter:blur(0px);}50%{transform:scale(1.3);filter:blur(8px);}100%{transform:scale(1);filter:blur(0px);}}`,
	easing: "ease-in-out",
};
