import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const LINE_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "thickness",
		label: "Thickness",
		type: "number",
		default: 48,
		min: 1,
		max: 256,
		step: 1,
		shortLabel: "T",
	},
	{
		key: "rounded",
		label: "Rounded ends",
		type: "boolean",
		default: true,
	},
];

export const lineGraphicDefinition: GraphicDefinition = {
	id: "line",
	name: "Line",
	keywords: ["line", "bar", "divider", "rule", "stroke"],
	params: LINE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, strokeDash, strokeTaper, inset } =
			readShapeBaseStyle(params);
		const thickness = Math.max(
			1,
			Math.min(height - inset * 2, Number(params.thickness ?? 48)),
		);
		const rounded = params.rounded !== false;
		const centerY = height / 2;
		const left = inset;
		const lineWidth = Math.max(1, width - inset * 2);
		const radius = rounded ? thickness / 2 : 0;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.roundRect(left, centerY - thickness / 2, lineWidth, thickness, radius);
		ctx.fillStyle = fill;
		ctx.fill(path);

		if (strokeWidth > 0) {
			applyAlignedStroke({
				ctx,
				path,
				strokeWidth,
				strokeAlign,
				strokeColor: stroke,
				strokeDash,
				strokeTaper,
			});
		}
	},
};
