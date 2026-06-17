import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import {
	FILL_PARAM,
	STROKE_PARAMS,
	readShapeBaseStyle,
	traceRoundedPath,
} from "./shared";
import type { GraphicDefinition } from "../types";

const ARROW_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "thickness",
		label: "Thickness",
		type: "number",
		default: 70,
		min: 2,
		max: 256,
		step: 1,
		shortLabel: "T",
	},
	{
		key: "headSize",
		label: "Head size",
		type: "number",
		default: 38,
		min: 5,
		max: 90,
		step: 1,
		unit: "percent",
		shortLabel: "H",
	},
	{
		key: "doubleHeaded",
		label: "Double headed",
		type: "boolean",
		default: false,
	},
];

export const arrowGraphicDefinition: GraphicDefinition = {
	id: "arrow",
	name: "Arrow",
	keywords: ["arrow", "pointer", "direction"],
	params: ARROW_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const centerY = height / 2;
		const left = inset;
		const right = width - inset;
		const usableWidth = Math.max(1, right - left);
		const shaft = Math.max(
			1,
			Math.min(height - inset * 2, Number(params.thickness ?? 70)),
		);
		const headHalf = Math.min(height / 2 - inset, shaft * 1.45);
		const doubleHeaded = params.doubleHeaded === true;
		const headWidth = Math.max(
			1,
			Math.min(
				usableWidth * (doubleHeaded ? 0.45 : 0.9),
				(Number(params.headSize ?? 38) / 100) * usableWidth,
			),
		);
		const top = centerY - shaft / 2;
		const bottom = centerY + shaft / 2;
		const rightBack = right - headWidth;

		const vertices = doubleHeaded
			? [
					{ x: left, y: centerY },
					{ x: left + headWidth, y: centerY - headHalf },
					{ x: left + headWidth, y: top },
					{ x: rightBack, y: top },
					{ x: rightBack, y: centerY - headHalf },
					{ x: right, y: centerY },
					{ x: rightBack, y: centerY + headHalf },
					{ x: rightBack, y: bottom },
					{ x: left + headWidth, y: bottom },
					{ x: left + headWidth, y: centerY + headHalf },
				]
			: [
					{ x: left, y: top },
					{ x: rightBack, y: top },
					{ x: rightBack, y: centerY - headHalf },
					{ x: right, y: centerY },
					{ x: rightBack, y: centerY + headHalf },
					{ x: rightBack, y: bottom },
					{ x: left, y: bottom },
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
