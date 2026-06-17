import { graphicsRegistry } from "../registry";
import { arcGraphicDefinition } from "./arc";
import { arrowGraphicDefinition } from "./arrow";
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
];

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
};
export { STROKE_ALIGN_PARAM } from "./shared";
