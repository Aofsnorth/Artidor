import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const SHIELD_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

/** Badge / crest shield: flat top, curved shoulders, pointed bottom. */
export const shieldGraphicDefinition: GraphicDefinition = {
	id: "shield",
	name: "Shield",
	keywords: ["shield", "badge", "crest", "secure", "guard", "protect"],
	params: SHIELD_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const cx = x + w / 2;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.moveTo(x, y + h * 0.08);
		path.lineTo(cx, y);
		path.lineTo(x + w, y + h * 0.08);
		path.lineTo(x + w, y + h * 0.5);
		// Curve both lower sides down to the point.
		path.bezierCurveTo(
			x + w,
			y + h * 0.82,
			x + w * 0.72,
			y + h * 0.97,
			cx,
			y + h,
		);
		path.bezierCurveTo(
			x + w * 0.28,
			y + h * 0.97,
			x,
			y + h * 0.82,
			x,
			y + h * 0.5,
		);
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
