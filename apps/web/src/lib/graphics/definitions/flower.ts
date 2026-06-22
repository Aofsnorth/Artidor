import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const FLOWER_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "petals",
		label: "Petals",
		type: "number",
		default: 6,
		min: 3,
		max: 16,
		step: 1,
		shortLabel: "P",
	},
	{
		key: "petalDepth",
		label: "Petal depth",
		type: "number",
		default: 45,
		min: 10,
		max: 80,
		step: 1,
		unit: "percent",
		shortLabel: "D",
	},
];

/**
 * A rounded flower / scalloped blob: a polar curve with `petals` lobes. With a
 * high petal count and low depth it reads as a "blob"/sticker badge; with fewer
 * petals it's a flower.
 */
export const flowerGraphicDefinition: GraphicDefinition = {
	id: "flower",
	name: "Flower",
	keywords: ["flower", "blob", "scallop", "petal", "badge", "cloud"],
	params: FLOWER_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const cx = width / 2;
		const cy = height / 2;
		const maxR = Math.max(1, Math.min(width, height) / 2 - inset);
		const petals = Math.max(
			3,
			Math.min(16, Math.round(Number(params.petals ?? 6))),
		);
		const depth =
			Math.min(80, Math.max(10, Number(params.petalDepth ?? 45))) / 100;
		const base = maxR * (1 - depth / 2);
		const amp = maxR * (depth / 2);
		const steps = Math.max(120, petals * 24);

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		for (let i = 0; i <= steps; i++) {
			const t = (i / steps) * Math.PI * 2;
			const r = base + amp * Math.cos(petals * t);
			const x = cx + Math.cos(t) * r;
			const y = cy + Math.sin(t) * r;
			if (i === 0) path.moveTo(x, y);
			else path.lineTo(x, y);
		}
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
