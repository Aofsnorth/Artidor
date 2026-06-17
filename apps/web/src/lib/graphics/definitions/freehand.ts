import type { GraphicDefinition } from "../types";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import { applyAlignedStroke } from "../stroke";

/**
 * Freehand drawing definition — stores an SVG path string as a "pathData"
 * param on the element (not in the definition's params array, so it's
 * hidden from the inspector). The path data is captured by the freehand
 * draw tool (useFreehandDraw hook) and stored as a string compatible with
 * `new Path2D(d)`.
 *
 * The inspector only shows fill, stroke, and closed — the path geometry
 * is edited by redrawing, not through parameter fields.
 */
export const freehandDefinition: GraphicDefinition = {
	id: "freehand",
	name: "Freehand",
	keywords: ["draw", "pen", "sketch", "freehand", "path", "stroke"],
	params: [
		FILL_PARAM,
		...STROKE_PARAMS,
		{
			key: "closed",
			type: "boolean",
			label: "Closed path",
			default: false,
		},
	],
	render({ ctx, params, width, height }) {
		ctx.clearRect(0, 0, width, height);

		const pathData = (params.pathData as string) ?? "";
		if (!pathData) return;

		const { fill, stroke, strokeWidth, strokeAlign } =
			readShapeBaseStyle(params);

		const path = new Path2D(pathData);

		// Fill the path (for closed freehand shapes)
		const closed = params.closed as boolean;
		if (closed && fill) {
			ctx.fillStyle = fill;
			ctx.fill(path);
		}

		// Stroke the path
		if (stroke && strokeWidth > 0) {
			applyAlignedStroke({
				ctx,
				path,
				strokeColor: stroke,
				strokeWidth,
				strokeAlign,
			});
		}
	},
};
