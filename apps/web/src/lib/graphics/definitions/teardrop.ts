import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const TEARDROP_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

/** A water drop / location-pin-less teardrop: round bottom, pointed top. */
export const teardropGraphicDefinition: GraphicDefinition = {
	id: "teardrop",
	name: "Teardrop",
	keywords: ["teardrop", "drop", "water", "rain", "blood"],
	params: TEARDROP_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const cx = x + w / 2;
		const tipY = y;
		const bulbCenterY = y + h * 0.62;
		const bulbR = Math.min(w / 2, h * 0.38);

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.moveTo(cx, tipY);
		path.bezierCurveTo(
			cx + bulbR * 1.1,
			bulbCenterY - bulbR,
			cx + bulbR,
			bulbCenterY + bulbR,
			cx,
			bulbCenterY + bulbR,
		);
		path.bezierCurveTo(
			cx - bulbR,
			bulbCenterY + bulbR,
			cx - bulbR * 1.1,
			bulbCenterY - bulbR,
			cx,
			tipY,
		);
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
