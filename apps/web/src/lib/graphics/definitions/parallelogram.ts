import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import {
	FILL_PARAM,
	STROKE_PARAMS,
	readShapeBaseStyle,
	traceRoundedPath,
} from "./shared";
import type { GraphicDefinition } from "../types";

const PARALLELOGRAM_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "slant",
		label: "Slant",
		type: "number",
		default: 25,
		min: 0,
		max: 60,
		step: 1,
		unit: "percent",
		shortLabel: "S",
	},
];

export const parallelogramGraphicDefinition: GraphicDefinition = {
	id: "parallelogram",
	name: "Parallelogram",
	keywords: ["parallelogram", "rhomboid", "slant", "skew"],
	params: PARALLELOGRAM_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const slant =
			(Math.min(60, Math.max(0, Number(params.slant ?? 25))) / 100) * w;
		const vertices = [
			{ x: x + slant, y },
			{ x: x + w, y },
			{ x: x + w - slant, y: y + h },
			{ x, y: y + h },
		];

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		traceRoundedPath({ path, vertices, radius: 0 });
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
