import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const CRESCENT_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "phase",
		label: "Phase",
		type: "number",
		default: 55,
		min: 10,
		max: 95,
		step: 1,
		unit: "percent",
		shortLabel: "P",
	},
];

export const crescentGraphicDefinition: GraphicDefinition = {
	id: "crescent",
	name: "Crescent",
	keywords: ["crescent", "moon", "lune", "night"],
	params: CRESCENT_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const centerX = width / 2;
		const centerY = height / 2;
		const radius = Math.max(1, Math.min(width, height) / 2 - inset);
		const phase = Math.min(95, Math.max(10, Number(params.phase ?? 55))) / 100;
		// The cutting circle slides right as `phase` grows, thinning the crescent.
		const offset = radius * phase;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.arc(centerX, centerY, radius, 0, Math.PI * 2);
		path.arc(centerX + offset, centerY, radius, 0, Math.PI * 2);
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
