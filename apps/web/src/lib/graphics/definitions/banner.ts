import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const BANNER_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "notch",
		label: "Notch",
		type: "number",
		default: 18,
		min: 0,
		max: 50,
		step: 1,
		unit: "percent",
		shortLabel: "N",
	},
];

export const bannerGraphicDefinition: GraphicDefinition = {
	id: "banner",
	name: "Banner",
	keywords: ["banner", "ribbon", "flag"],
	params: BANNER_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } = readShapeBaseStyle(params);
		const drawWidth = Math.max(1, width - inset * 2);
		const drawHeight = Math.max(1, height - inset * 2);
		const notch = Math.min(50, Math.max(0, Number(params.notch ?? 18))) / 100;
		const notchWidth = drawWidth * notch;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		path.moveTo(inset, inset);
		path.lineTo(inset + drawWidth, inset);
		path.lineTo(inset + drawWidth - notchWidth, inset + drawHeight / 2);
		path.lineTo(inset + drawWidth, inset + drawHeight);
		path.lineTo(inset, inset + drawHeight);
		path.lineTo(inset + notchWidth, inset + drawHeight / 2);
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
