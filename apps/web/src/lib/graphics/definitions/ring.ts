import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const RING_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "thickness",
		label: "Thickness",
		type: "number",
		default: 28,
		min: 2,
		max: 95,
		step: 1,
		unit: "percent",
		shortLabel: "T",
	},
];

export const ringGraphicDefinition: GraphicDefinition = {
	id: "ring",
	name: "Ring",
	keywords: ["ring", "donut", "circle", "loop", "annulus"],
	params: RING_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const centerX = width / 2;
		const centerY = height / 2;
		const outerX = Math.max(1, width / 2 - inset);
		const outerY = Math.max(1, height / 2 - inset);
		const band =
			Math.min(95, Math.max(2, Number(params.thickness ?? 28))) / 100;
		const innerX = outerX * (1 - band);
		const innerY = outerY * (1 - band);

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.ellipse(centerX, centerY, outerX, outerY, 0, 0, Math.PI * 2);
		path.ellipse(centerX, centerY, innerX, innerY, 0, 0, Math.PI * 2);
		fillShapePath({ ctx, path, fill, width, height, fillRule: "evenodd" });

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
