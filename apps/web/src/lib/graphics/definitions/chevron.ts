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

const CHEVRON_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "thickness",
		label: "Thickness",
		type: "number",
		default: 32,
		min: 5,
		max: 70,
		step: 1,
		unit: "percent",
		shortLabel: "T",
	},
];

export const chevronGraphicDefinition: GraphicDefinition = {
	id: "chevron",
	name: "Chevron",
	keywords: ["chevron", "angle", "caret", "next"],
	params: CHEVRON_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const centerY = y + h / 2;
		const thickness = Math.max(
			1,
			(Math.min(70, Math.max(5, Number(params.thickness ?? 32))) / 100) * w,
		);

		const vertices = [
			{ x, y },
			{ x: x + w, y: centerY },
			{ x, y: y + h },
			{ x: x + thickness, y: y + h },
			{ x: x + w - thickness, y: centerY },
			{ x: x + thickness, y },
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
