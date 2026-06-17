import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const CLOUD_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

/** A puffy cloud built from overlapping circles unioned by a flat base. */
export const cloudGraphicDefinition: GraphicDefinition = {
	id: "cloud",
	name: "Cloud",
	keywords: ["cloud", "weather", "sky", "puff"],
	params: CLOUD_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const baseY = y + h * 0.78;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.moveTo(x + w * 0.2, baseY);
		path.arc(
			x + w * 0.28,
			y + h * 0.55,
			h * 0.23,
			Math.PI * 0.9,
			Math.PI * 1.6,
		);
		path.arc(x + w * 0.45, y + h * 0.4, h * 0.3, Math.PI * 1.15, Math.PI * 1.9);
		path.arc(
			x + w * 0.68,
			y + h * 0.48,
			h * 0.26,
			Math.PI * 1.5,
			Math.PI * 2.15,
		);
		path.arc(x + w * 0.8, y + h * 0.6, h * 0.18, Math.PI * 1.8, Math.PI * 2.5);
		path.lineTo(x + w * 0.8, baseY);
		path.closePath();
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
