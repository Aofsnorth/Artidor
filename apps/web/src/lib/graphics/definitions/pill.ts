import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const PILL_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

export const pillGraphicDefinition: GraphicDefinition = {
	id: "pill",
	name: "Pill",
	keywords: ["pill", "capsule"],
	params: PILL_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } = readShapeBaseStyle(params);
		const drawWidth = Math.max(1, width - inset * 2);
		const drawHeight = Math.max(1, height - inset * 2);
		const radius = Math.min(drawWidth, drawHeight) / 2;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.roundRect(inset, inset, drawWidth, drawHeight, radius);
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
