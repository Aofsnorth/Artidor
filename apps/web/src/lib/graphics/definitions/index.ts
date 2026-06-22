import { graphicsRegistry } from "../registry";
import { arcGraphicDefinition } from "./arc";
import { arrowGraphicDefinition } from "./arrow";
import { bannerGraphicDefinition } from "./banner";
import { burstGraphicDefinition } from "./burst";
import { chevronGraphicDefinition } from "./chevron";
import { cloudGraphicDefinition } from "./cloud";
import { crescentGraphicDefinition } from "./crescent";
import { crossGraphicDefinition } from "./cross";
import { ellipseGraphicDefinition } from "./ellipse";
import { flowerGraphicDefinition } from "./flower";
import { gearGraphicDefinition } from "./gear";
import { heartGraphicDefinition } from "./heart";
import { houseGraphicDefinition } from "./house";
import { lightningGraphicDefinition } from "./lightning";
import { lineGraphicDefinition } from "./line";
import { octagonGraphicDefinition } from "./octagon";
import { parallelogramGraphicDefinition } from "./parallelogram";
import { pieGraphicDefinition } from "./pie";
import { pinGraphicDefinition } from "./pin";
import { polygonGraphicDefinition } from "./polygon";
import { rectangleGraphicDefinition } from "./rectangle";
import { rhombusGraphicDefinition } from "./rhombus";
import { rightTriangleGraphicDefinition } from "./right-triangle";
import { ringGraphicDefinition } from "./ring";
import { shieldGraphicDefinition } from "./shield";
import { speechBubbleGraphicDefinition } from "./speech-bubble";
import { squircleGraphicDefinition } from "./squircle";
import { starGraphicDefinition } from "./star";
import { teardropGraphicDefinition } from "./teardrop";
import { trapezoidGraphicDefinition } from "./trapezoid";
import { freehandDefinition } from "./freehand";
import { circleGraphicDefinition } from "./circle";
import { squareGraphicDefinition } from "./square";
import { triangleGraphicDefinition } from "./triangle";
import { pentagonGraphicDefinition } from "./pentagon";
import { hexagonGraphicDefinition } from "./hexagon";
import { heptagonGraphicDefinition } from "./heptagon";
import { nonagonGraphicDefinition } from "./nonagon";
import { decagonGraphicDefinition } from "./decagon";
import { roundedRectangleGraphicDefinition } from "./rounded-rectangle";
import { pillGraphicDefinition } from "./pill";

const defaultGraphicDefinitions = [
	rectangleGraphicDefinition,
	ellipseGraphicDefinition,
	polygonGraphicDefinition,
	starGraphicDefinition,
	lineGraphicDefinition,
	arrowGraphicDefinition,
	ringGraphicDefinition,
	crossGraphicDefinition,
	rightTriangleGraphicDefinition,
	chevronGraphicDefinition,
	heartGraphicDefinition,
	lightningGraphicDefinition,
	crescentGraphicDefinition,
	speechBubbleGraphicDefinition,
	trapezoidGraphicDefinition,
	parallelogramGraphicDefinition,
	pieGraphicDefinition,
	arcGraphicDefinition,
	gearGraphicDefinition,
	burstGraphicDefinition,
	flowerGraphicDefinition,
	teardropGraphicDefinition,
	pinGraphicDefinition,
	shieldGraphicDefinition,
	cloudGraphicDefinition,
	rhombusGraphicDefinition,
	houseGraphicDefinition,
	squircleGraphicDefinition,
	freehandDefinition,
	octagonGraphicDefinition,
	bannerGraphicDefinition,
	circleGraphicDefinition,
	squareGraphicDefinition,
	triangleGraphicDefinition,
	pentagonGraphicDefinition,
	hexagonGraphicDefinition,
	heptagonGraphicDefinition,
	nonagonGraphicDefinition,
	decagonGraphicDefinition,
	roundedRectangleGraphicDefinition,
	pillGraphicDefinition,
];

/**
 * Back-compat aliases for graphic ids removed in the 2026-06 placeholder purge.
 * Older saved projects may still reference these ids; we resolve them to the
 * real shape they were a stub/duplicate of so nothing throws on load.
 * - capsule was identical to pill; diamond was a duplicate of rhombus.
 * - the remaining ids were rectangle-fallback stubs, so they map to rectangle.
 */
export const GRAPHIC_ID_ALIASES: Record<string, string> = {
	capsule: "pill",
	diamond: "rhombus",
	zigzag: "rectangle",
	wave: "rectangle",
	"thought-bubble": "speech-bubble",
	swirl: "rectangle",
	"straight-line": "line",
	spiral: "rectangle",
	"semi-circle": "pie",
	"rounded-polygon": "polygon",
	"rounded-burst": "burst",
	ribbon: "banner",
	"quarter-circle": "pie",
	"pie-slice": "pie",
	petal: "teardrop",
	"lightning-bolt": "lightning",
	leaf: "teardrop",
	"generic-polygon": "polygon",
	frame: "rectangle",
	drop: "teardrop",
	"double-chevron": "chevron",
	"dotted-line": "line",
	"double-arrow": "arrow",
	"dashed-line": "line",
	"curved-path": "line",
	"curved-arrow": "arrow",
	checkmark: "cross",
	"callout-label": "speech-bubble",
	bracket: "rectangle",
	blob: "ellipse",
	badge: "ring",
};

export function registerDefaultGraphics(): void {
	for (const definition of defaultGraphicDefinitions) {
		if (graphicsRegistry.has(definition.id)) {
			continue;
		}
		graphicsRegistry.register(definition.id, definition);
	}
}

export {
	arcGraphicDefinition,
	arrowGraphicDefinition,
	bannerGraphicDefinition,
	burstGraphicDefinition,
	chevronGraphicDefinition,
	cloudGraphicDefinition,
	crescentGraphicDefinition,
	crossGraphicDefinition,
	ellipseGraphicDefinition,
	flowerGraphicDefinition,
	freehandDefinition,
	gearGraphicDefinition,
	heartGraphicDefinition,
	houseGraphicDefinition,
	lightningGraphicDefinition,
	lineGraphicDefinition,
	octagonGraphicDefinition,
	parallelogramGraphicDefinition,
	pieGraphicDefinition,
	pinGraphicDefinition,
	polygonGraphicDefinition,
	rectangleGraphicDefinition,
	rhombusGraphicDefinition,
	rightTriangleGraphicDefinition,
	ringGraphicDefinition,
	shieldGraphicDefinition,
	speechBubbleGraphicDefinition,
	squircleGraphicDefinition,
	starGraphicDefinition,
	teardropGraphicDefinition,
	trapezoidGraphicDefinition,
	circleGraphicDefinition,
	squareGraphicDefinition,
	triangleGraphicDefinition,
	pentagonGraphicDefinition,
	hexagonGraphicDefinition,
	heptagonGraphicDefinition,
	nonagonGraphicDefinition,
	decagonGraphicDefinition,
	roundedRectangleGraphicDefinition,
	pillGraphicDefinition,
};
export { STROKE_ALIGN_PARAM } from "./shared";
