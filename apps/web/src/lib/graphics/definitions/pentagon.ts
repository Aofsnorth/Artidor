import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const PENTAGON_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

export const pentagonGraphicDefinition: GraphicDefinition = {
	id: "pentagon",
	name: "Pentagon",
	keywords: ["pentagon"],
	params: PENTAGON_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();

		const cx = width / 2;
		const cy = height / 2;
		const rx = Math.max(1, width / 2 - inset);
		const ry = Math.max(1, height / 2 - inset);
		for (let i = 0; i < 5; i++) {
			const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
			const x = cx + Math.cos(angle) * rx;
			const y = cy + Math.sin(angle) * ry;
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
