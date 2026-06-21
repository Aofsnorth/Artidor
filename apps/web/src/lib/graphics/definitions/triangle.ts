import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const TRIANGLE_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

export const triangleGraphicDefinition: GraphicDefinition = {
	id: "triangle",
	name: "Triangle",
	keywords: ['triangle'],
	params: TRIANGLE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } = readShapeBaseStyle(params);
		
		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		
		const cx = width / 2;
		const top = inset;
		const bottom = height - inset;
		path.moveTo(cx, top);
		path.lineTo(inset, bottom);
		path.lineTo(width - inset, bottom);
		path.closePath();
		
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
