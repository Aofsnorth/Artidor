import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const PIE_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "sweep",
		label: "Sweep",
		type: "number",
		default: 75,
		min: 1,
		max: 100,
		step: 1,
		unit: "percent",
		shortLabel: "A",
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

export const pieGraphicDefinition: GraphicDefinition = {
	id: "pie",
	name: "Pie",
	keywords: ["pie", "wedge", "sector", "pacman", "chart"],
	params: PIE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const centerX = width / 2;
		const centerY = height / 2;
		const radius = Math.max(1, Math.min(width, height) / 2 - inset);
		const sweep =
			(Math.min(100, Math.max(1, Number(params.sweep ?? 75))) / 100) *
			Math.PI *
			2;
		const start = (Number(params.rotation ?? 0) * Math.PI) / 180 - Math.PI / 2;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.moveTo(centerX, centerY);
		path.arc(centerX, centerY, radius, start, start + sweep);
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
