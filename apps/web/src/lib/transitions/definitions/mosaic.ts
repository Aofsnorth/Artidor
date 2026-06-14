import type { TransitionDefinition } from "../types";

export const mosaicTransition: TransitionDefinition = {
	type: "mosaic",
	name: "Mosaic",
	keywords: ["mosaic", "tile", "block", "shatter", "puzzle"],
	category: "wipe",
	defaultDuration: 900,
	minDuration: 200,
	maxDuration: 3000,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		direction === "in"
			? `@keyframes transition-mosaic-in{0%{clip-path:polygon(0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0);}25%{clip-path:polygon(0 0, 33% 0, 33% 33%, 0 33%, 0 0, 0 0, 0 0, 0 0, 0 0);}50%{clip-path:polygon(33% 0, 66% 0, 66% 33%, 33% 33%, 0 33%, 0 33%, 0 0, 0 0, 0 0);}75%{clip-path:polygon(66% 0, 100% 0, 100% 33%, 66% 33%, 33% 33%, 33% 33%, 0 33%, 0 33%, 0 0);}100%{clip-path:polygon(100% 0, 100% 33%, 100% 66%, 100% 100%, 66% 100%, 33% 100%, 0 100%, 0 66%, 0 33%);}}`
			: `@keyframes transition-mosaic-out{0%{clip-path:polygon(100% 0, 100% 33%, 100% 66%, 100% 100%, 66% 100%, 33% 100%, 0 100%, 0 66%, 0 33%);}25%{clip-path:polygon(66% 0, 100% 0, 100% 33%, 66% 33%, 33% 33%, 33% 33%, 0 33%, 0 33%, 0 0);}50%{clip-path:polygon(33% 0, 66% 0, 66% 33%, 33% 33%, 0 33%, 0 33%, 0 0, 0 0, 0 0);}75%{clip-path:polygon(0 0, 33% 0, 33% 33%, 0 33%, 0 0, 0 0, 0 0, 0 0, 0 0);}100%{clip-path:polygon(0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0);}}`,
	easing: "ease-in-out",
};
