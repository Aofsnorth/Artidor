import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import {
	FILL_PARAM,
	STROKE_PARAMS,
	readShapeBaseStyle,
	traceRoundedPath,
} from "./shared";
import type { GraphicDefinition } from "../types";

const RIGHT_TRIANGLE_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "cornerRadius",
		label: "Corner radius",
		type: "number",
		default: 0,
		min: 0,
		max: 50,
		step: 1,
		shortLabel: "R",
	},
];

export const rightTriangleGraphicDefinition: GraphicDefinition = {
	id: "right-triangle",
	name: "Right Triangle",
	keywords: ["triangle", "right", "corner", "wedge"],
	params: RIGHT_TRIANGLE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const vertices = [
			{ x, y },
			{ x, y: y + h },
			{ x: x + w, y: y + h },
		];
		const radiusPercent = Math.max(
			0,
			Math.min(50, Number(params.cornerRadius ?? 0)),
		);
		const radius = (Math.min(w, h) / 4) * (radiusPercent / 50);

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		traceRoundedPath({ path, vertices, radius });
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
