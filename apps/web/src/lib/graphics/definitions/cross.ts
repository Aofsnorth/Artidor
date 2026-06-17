import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import {
	FILL_PARAM,
	STROKE_PARAMS,
	readShapeBaseStyle,
	traceRoundedPath,
} from "./shared";
import type { GraphicDefinition } from "../types";

const CROSS_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "thickness",
		label: "Thickness",
		type: "number",
		default: 36,
		min: 10,
		max: 90,
		step: 1,
		unit: "percent",
		shortLabel: "T",
	},
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

export const crossGraphicDefinition: GraphicDefinition = {
	id: "cross",
	name: "Cross",
	keywords: ["cross", "plus", "add", "medical"],
	params: CROSS_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const centerX = width / 2;
		const centerY = height / 2;
		const half = Math.max(1, Math.min(width, height) / 2 - inset);
		const armHalf =
			(Math.min(90, Math.max(10, Number(params.thickness ?? 36))) / 100) * half;
		const vertices = [
			{ x: centerX - armHalf, y: centerY - half },
			{ x: centerX + armHalf, y: centerY - half },
			{ x: centerX + armHalf, y: centerY - armHalf },
			{ x: centerX + half, y: centerY - armHalf },
			{ x: centerX + half, y: centerY + armHalf },
			{ x: centerX + armHalf, y: centerY + armHalf },
			{ x: centerX + armHalf, y: centerY + half },
			{ x: centerX - armHalf, y: centerY + half },
			{ x: centerX - armHalf, y: centerY + armHalf },
			{ x: centerX - half, y: centerY + armHalf },
			{ x: centerX - half, y: centerY - armHalf },
			{ x: centerX - armHalf, y: centerY - armHalf },
		];
		const radiusPercent = Math.max(
			0,
			Math.min(50, Number(params.cornerRadius ?? 0)),
		);
		const radius = armHalf * (radiusPercent / 50);

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
