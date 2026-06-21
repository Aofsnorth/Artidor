import { graphicsRegistry } from "../registry";
import { arcGraphicDefinition } from "./arc";
import { arrowGraphicDefinition } from "./arrow";
import { bannerGraphicDefinition } from "./banner";
import { capsuleGraphicDefinition } from "./capsule";
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
import { diamondGraphicDefinition } from "./diamond";
import { triangleGraphicDefinition } from "./triangle";
import { pentagonGraphicDefinition } from "./pentagon";
import { hexagonGraphicDefinition } from "./hexagon";
import { heptagonGraphicDefinition } from "./heptagon";
import { nonagonGraphicDefinition } from "./nonagon";
import { decagonGraphicDefinition } from "./decagon";
import { roundedRectangleGraphicDefinition } from "./rounded-rectangle";
import { pillGraphicDefinition } from "./pill";
import { waveGraphicDefinition } from "./wave";
import { spiralGraphicDefinition } from "./spiral";
import { ribbonGraphicDefinition } from "./ribbon";
import { badgeGraphicDefinition } from "./badge";
import { frameGraphicDefinition } from "./frame";
import { genericPolygonGraphicDefinition } from "./generic-polygon";
import { roundedPolygonGraphicDefinition } from "./rounded-polygon";
import { roundedBurstGraphicDefinition } from "./rounded-burst";
import { pieSliceGraphicDefinition } from "./pie-slice";
import { semiCircleGraphicDefinition } from "./semi-circle";
import { quarterCircleGraphicDefinition } from "./quarter-circle";
import { dropGraphicDefinition } from "./drop";
import { leafGraphicDefinition } from "./leaf";
import { petalGraphicDefinition } from "./petal";
import { blobGraphicDefinition } from "./blob";
import { zigzagGraphicDefinition } from "./zigzag";
import { swirlGraphicDefinition } from "./swirl";
import { straightLineGraphicDefinition } from "./straight-line";
import { dashedLineGraphicDefinition } from "./dashed-line";
import { dottedLineGraphicDefinition } from "./dotted-line";
import { curvedPathGraphicDefinition } from "./curved-path";
import { doubleArrowGraphicDefinition } from "./double-arrow";
import { curvedArrowGraphicDefinition } from "./curved-arrow";
import { doubleChevronGraphicDefinition } from "./double-chevron";
import { thoughtBubbleGraphicDefinition } from "./thought-bubble";
import { calloutLabelGraphicDefinition } from "./callout-label";
import { bracketGraphicDefinition } from "./bracket";
import { checkmarkGraphicDefinition } from "./checkmark";
import { lightningBoltGraphicDefinition } from "./lightning-bolt";

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
	capsuleGraphicDefinition,
	octagonGraphicDefinition,
	bannerGraphicDefinition,
	circleGraphicDefinition,
	squareGraphicDefinition,
	diamondGraphicDefinition,
	triangleGraphicDefinition,
	pentagonGraphicDefinition,
	hexagonGraphicDefinition,
	heptagonGraphicDefinition,
	nonagonGraphicDefinition,
	decagonGraphicDefinition,
	roundedRectangleGraphicDefinition,
	pillGraphicDefinition,
	waveGraphicDefinition,
	spiralGraphicDefinition,
	ribbonGraphicDefinition,
	badgeGraphicDefinition,
	frameGraphicDefinition,
	genericPolygonGraphicDefinition,
	roundedPolygonGraphicDefinition,
	roundedBurstGraphicDefinition,
	pieSliceGraphicDefinition,
	semiCircleGraphicDefinition,
	quarterCircleGraphicDefinition,
	dropGraphicDefinition,
	leafGraphicDefinition,
	petalGraphicDefinition,
	blobGraphicDefinition,
	zigzagGraphicDefinition,
	swirlGraphicDefinition,
	straightLineGraphicDefinition,
	dashedLineGraphicDefinition,
	dottedLineGraphicDefinition,
	curvedPathGraphicDefinition,
	doubleArrowGraphicDefinition,
	curvedArrowGraphicDefinition,
	doubleChevronGraphicDefinition,
	thoughtBubbleGraphicDefinition,
	calloutLabelGraphicDefinition,
	bracketGraphicDefinition,
	checkmarkGraphicDefinition,
	lightningBoltGraphicDefinition,
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
	bannerGraphicDefinition,
	capsuleGraphicDefinition,
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
	diamondGraphicDefinition,
	triangleGraphicDefinition,
	pentagonGraphicDefinition,
	hexagonGraphicDefinition,
	heptagonGraphicDefinition,
	nonagonGraphicDefinition,
	decagonGraphicDefinition,
	roundedRectangleGraphicDefinition,
	pillGraphicDefinition,
	waveGraphicDefinition,
	spiralGraphicDefinition,
	ribbonGraphicDefinition,
	badgeGraphicDefinition,
	frameGraphicDefinition,
	genericPolygonGraphicDefinition,
	roundedPolygonGraphicDefinition,
	roundedBurstGraphicDefinition,
	pieSliceGraphicDefinition,
	semiCircleGraphicDefinition,
	quarterCircleGraphicDefinition,
	dropGraphicDefinition,
	leafGraphicDefinition,
	petalGraphicDefinition,
	blobGraphicDefinition,
	zigzagGraphicDefinition,
	swirlGraphicDefinition,
	straightLineGraphicDefinition,
	dashedLineGraphicDefinition,
	dottedLineGraphicDefinition,
	curvedPathGraphicDefinition,
	doubleArrowGraphicDefinition,
	curvedArrowGraphicDefinition,
	doubleChevronGraphicDefinition,
	thoughtBubbleGraphicDefinition,
	calloutLabelGraphicDefinition,
	bracketGraphicDefinition,
	checkmarkGraphicDefinition,
	lightningBoltGraphicDefinition,
};
export { STROKE_ALIGN_PARAM } from "./shared";
