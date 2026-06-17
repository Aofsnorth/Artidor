import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import {
	FILL_PARAM,
	STROKE_PARAMS,
	readShapeBaseStyle,
	traceRoundedPath,
} from "./shared";
import type { GraphicDefinition } from "../types";

const LIGHTNING_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

// Normalised (0..1) silhouette of a lightning bolt, traced clockwise.
const BOLT_POINTS: ReadonlyArray<{ x: number; y: number }> = [
	{ x: 0.56, y: 0.0 },
	{ x: 0.16, y: 0.54 },
	{ x: 0.43, y: 0.54 },
	{ x: 0.32, y: 1.0 },
	{ x: 0.84, y: 0.42 },
	{ x: 0.55, y: 0.42 },
	{ x: 0.74, y: 0.0 },
];

export const lightningGraphicDefinition: GraphicDefinition = {
	id: "lightning",
	name: "Lightning",
	keywords: ["lightning", "bolt", "flash", "thunder", "power"],
	params: LIGHTNING_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const vertices = BOLT_POINTS.map((point) => ({
			x: x + point.x * w,
			y: y + point.y * h,
		}));

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
