import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import {
	FILL_PARAM,
	STROKE_PARAMS,
	readShapeBaseStyle,
	traceRoundedPath,
} from "./shared";
import type { GraphicDefinition } from "../types";

const HOUSE_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "roofRatio",
		label: "Roof height",
		type: "number",
		default: 40,
		min: 10,
		max: 70,
		step: 1,
		unit: "percent",
		shortLabel: "H",
	},
];

/** Pentagon "home" shape: triangular roof over a rectangular body. */
export const houseGraphicDefinition: GraphicDefinition = {
	id: "house",
	name: "Home",
	keywords: ["house", "home", "pentagon", "building", "roof"],
	params: HOUSE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const roof =
			(Math.min(70, Math.max(10, Number(params.roofRatio ?? 40))) / 100) * h;
		const vertices = [
			{ x: x + w / 2, y },
			{ x: x + w, y: y + roof },
			{ x: x + w, y: y + h },
			{ x, y: y + h },
			{ x, y: y + roof },
		];

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		traceRoundedPath({ path, vertices, radius: 0 });
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
