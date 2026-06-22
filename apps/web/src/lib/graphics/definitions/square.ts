import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const SQUARE_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

export const squareGraphicDefinition: GraphicDefinition = {
	id: "square",
	name: "Square",
	keywords: ['square', 'box'],
	params: SQUARE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } = readShapeBaseStyle(params);
		
		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		
		const size = Math.max(1, Math.min(width, height) - inset * 2);
		const x = (width - size) / 2;
		const y = (height - size) / 2;
		path.rect(x, y, size, size);
		
		fillShapePath({ ctx, path, fill, width, height });

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
