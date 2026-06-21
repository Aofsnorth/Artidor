import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const CIRCLE_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

export const circleGraphicDefinition: GraphicDefinition = {
	id: "circle",
	name: "Circle",
	keywords: ['circle', 'round', 'dot'],
	params: CIRCLE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } = readShapeBaseStyle(params);
		
		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		
		const cx = width / 2;
		const cy = height / 2;
		const radius = Math.max(1, Math.min(width, height) / 2 - inset);
		path.arc(cx, cy, radius, 0, Math.PI * 2);
		
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
