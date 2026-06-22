import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const PIN_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

/** Map location pin: round head + pointed bottom tip. */
export const pinGraphicDefinition: GraphicDefinition = {
	id: "pin",
	name: "Location Pin",
	keywords: ["pin", "location", "map", "marker", "place"],
	params: PIN_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const cx = x + w / 2;
		const headR = Math.min(w / 2, h * 0.35);
		const headCY = y + headR;
		const tipY = y + h;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		// Start at the bottom tip, sweep up and around the head, back to tip.
		path.moveTo(cx, tipY);
		path.bezierCurveTo(
			cx - headR * 1.4,
			headCY + headR * 0.9,
			cx - headR,
			headCY + headR,
			cx - headR,
			headCY,
		);
		path.arc(cx, headCY, headR, Math.PI, 0, false);
		path.bezierCurveTo(
			cx + headR,
			headCY + headR,
			cx + headR * 1.4,
			headCY + headR * 0.9,
			cx,
			tipY,
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
