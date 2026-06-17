import { graphicsRegistry } from "../registry";
import { arrowGraphicDefinition } from "./arrow";
import { chevronGraphicDefinition } from "./chevron";
import { crescentGraphicDefinition } from "./crescent";
import { crossGraphicDefinition } from "./cross";
import { ellipseGraphicDefinition } from "./ellipse";
import { heartGraphicDefinition } from "./heart";
import { lightningGraphicDefinition } from "./lightning";
import { lineGraphicDefinition } from "./line";
import { polygonGraphicDefinition } from "./polygon";
import { rectangleGraphicDefinition } from "./rectangle";
import { rightTriangleGraphicDefinition } from "./right-triangle";
import { ringGraphicDefinition } from "./ring";
import { speechBubbleGraphicDefinition } from "./speech-bubble";
import { starGraphicDefinition } from "./star";

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
	arrowGraphicDefinition,
	chevronGraphicDefinition,
	crescentGraphicDefinition,
	crossGraphicDefinition,
	ellipseGraphicDefinition,
	heartGraphicDefinition,
	lightningGraphicDefinition,
	lineGraphicDefinition,
	polygonGraphicDefinition,
	rectangleGraphicDefinition,
	rightTriangleGraphicDefinition,
	ringGraphicDefinition,
	speechBubbleGraphicDefinition,
	starGraphicDefinition,
};
export { STROKE_ALIGN_PARAM } from "./shared";
