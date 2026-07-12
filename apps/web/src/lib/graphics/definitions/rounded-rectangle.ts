import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const ROUNDED_RECTANGLE_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "cornerRadius",
		label: "Corner radius",
		type: "number",
		default: 8,
		min: 0,
		max: 50,
		step: 1,
		shortLabel: "R",
	},
];

export const roundedRectangleGraphicDefinition: GraphicDefinition = {
	id: "rounded-rectangle",
	name: "Rounded Rectangle",
	keywords: ["rounded", "rectangle"],
	params: ROUNDED_RECTANGLE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const drawWidth = Math.max(1, width - inset * 2);
		const drawHeight = Math.max(1, height - inset * 2);
		const radiusPercent = Math.max(
			0,
			Math.min(50, Number(params.cornerRadius ?? 8)),
		);
		const radius = (Math.min(drawWidth, drawHeight) / 2) * (radiusPercent / 50);

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.roundRect(inset, inset, drawWidth, drawHeight, radius);
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
