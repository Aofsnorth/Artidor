import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const DIAMOND_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

export const diamondGraphicDefinition: GraphicDefinition = {
	id: "diamond",
	name: "Diamond",
	keywords: ['diamond'],
	params: DIAMOND_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } = readShapeBaseStyle(params);
		
		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		
		const cx = width / 2;
		const cy = height / 2;
		const rx = Math.max(1, width / 2 - inset);
		const ry = Math.max(1, height / 2 - inset);
		path.moveTo(cx, cy - ry);
		path.lineTo(cx + rx, cy);
		path.lineTo(cx, cy + ry);
		path.lineTo(cx - rx, cy);
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
