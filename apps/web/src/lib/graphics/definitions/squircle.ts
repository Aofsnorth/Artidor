import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const SQUIRCLE_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "curvature",
		label: "Curvature",
		type: "number",
		default: 40,
		min: 5,
		max: 100,
		step: 1,
		unit: "percent",
		shortLabel: "C",
	},
];

/** Superellipse (iOS-style "squircle"); curvature interpolates square→circle. */
export const squircleGraphicDefinition: GraphicDefinition = {
	id: "squircle",
	name: "Squircle",
	keywords: ["squircle", "superellipse", "rounded", "ios", "soft"],
	params: SQUIRCLE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const cx = width / 2;
		const cy = height / 2;
		const a = Math.max(1, width / 2 - inset);
		const b = Math.max(1, height / 2 - inset);
		// curvature 5% -> n≈8 (boxy), 100% -> n=2 (ellipse).
		const c = Math.min(100, Math.max(5, Number(params.curvature ?? 40))) / 100;
		const n = 2 + (1 - c) * 6;
		const steps = 180;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		for (let i = 0; i <= steps; i++) {
			const t = (i / steps) * Math.PI * 2;
			const cosT = Math.cos(t);
			const sinT = Math.sin(t);
			const x = cx + Math.sign(cosT) * a * Math.abs(cosT) ** (2 / n);
			const y = cy + Math.sign(sinT) * b * Math.abs(sinT) ** (2 / n);
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
