import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const ARC_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "sweep",
		label: "Sweep",
		type: "number",
		default: 60,
		min: 1,
		max: 100,
		step: 1,
		unit: "percent",
		shortLabel: "A",
	},
	{
		key: "thickness",
		label: "Thickness",
		type: "number",
		default: 26,
		min: 2,
		max: 95,
		step: 1,
		unit: "percent",
		shortLabel: "T",
	},
	{
		key: "rotation",
		label: "Start angle",
		type: "number",
		default: 0,
		min: 0,
		max: 360,
		step: 1,
		shortLabel: "R",
	},
];

export const arcGraphicDefinition: GraphicDefinition = {
	id: "arc",
	name: "Arc",
	keywords: ["arc", "ring", "gauge", "semi", "half", "rainbow"],
	params: ARC_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const centerX = width / 2;
		const centerY = height / 2;
		const outer = Math.max(1, Math.min(width, height) / 2 - inset);
		const band =
			Math.min(95, Math.max(2, Number(params.thickness ?? 26))) / 100;
		const innerR = outer * (1 - band);
		const sweep =
			(Math.min(100, Math.max(1, Number(params.sweep ?? 60))) / 100) *
			Math.PI *
			2;
		const start = (Number(params.rotation ?? 0) * Math.PI) / 180 - Math.PI / 2;
		const end = start + sweep;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.arc(centerX, centerY, outer, start, end);
		path.arc(centerX, centerY, innerR, end, start, true);
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
