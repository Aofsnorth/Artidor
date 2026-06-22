import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const HEART_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

export const heartGraphicDefinition: GraphicDefinition = {
	id: "heart",
	name: "Heart",
	keywords: ["heart", "love", "like", "favorite"],
	params: HEART_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const centerX = x + w / 2;
		const bottom = y + h * 0.96;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.moveTo(centerX, bottom);
		path.bezierCurveTo(
			x + w * 1.0,
			y + h * 0.62,
			x + w * 0.86,
			y + h * 0.02,
			centerX,
			y + h * 0.3,
		);
		path.bezierCurveTo(
			x + w * 0.14,
			y + h * 0.02,
			x,
			y + h * 0.62,
			centerX,
			bottom,
		);
		path.closePath();
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
