import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const DOTTED_LINE_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

export const dottedLineGraphicDefinition: GraphicDefinition = {
	id: "dotted-line",
	name: "Dotted Line",
	keywords: ['line', 'dotted'],
	params: DOTTED_LINE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } = readShapeBaseStyle(params);
		
		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		
		// Simple rectangle fallback for complex shapes
		path.rect(inset, inset, width - inset * 2, height - inset * 2);
		
		ctx.fillStyle = fill;
		ctx.fill(path);

		if (strokeWidth > 0) {
			applyAlignedStroke({
				ctx,
				path,
				strokeWidth,
				strokeAlign,
				strokeColor: stroke,
			});
		}
	},
};
