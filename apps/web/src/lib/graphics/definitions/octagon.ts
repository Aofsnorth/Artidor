import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const OCTAGON_PARAMS: ParamDefinition[] = [FILL_PARAM, ...STROKE_PARAMS];

export const octagonGraphicDefinition: GraphicDefinition = {
	id: "octagon",
	name: "Octagon",
	keywords: ["octagon", "polygon"],
	params: OCTAGON_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } = readShapeBaseStyle(params);
		const cx = width / 2;
		const cy = height / 2;
		const rx = Math.max(1, width / 2 - inset);
		const ry = Math.max(1, height / 2 - inset);
		const sides = 8;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		for (let i = 0; i < sides; i++) {
			const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
			const x = cx + Math.cos(angle) * rx;
			const y = cy + Math.sin(angle) * ry;
			if (i === 0) path.moveTo(x, y);
			else path.lineTo(x, y);
		}
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
