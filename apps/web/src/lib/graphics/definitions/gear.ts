import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const GEAR_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "teeth",
		label: "Teeth",
		type: "number",
		default: 8,
		min: 3,
		max: 24,
		step: 1,
		shortLabel: "N",
	},
	{
		key: "toothDepth",
		label: "Tooth depth",
		type: "number",
		default: 25,
		min: 5,
		max: 50,
		step: 1,
		unit: "percent",
		shortLabel: "D",
	},
	{
		key: "hole",
		label: "Hole size",
		type: "number",
		default: 35,
		min: 0,
		max: 80,
		step: 1,
		unit: "percent",
		shortLabel: "H",
	},
];

export const gearGraphicDefinition: GraphicDefinition = {
	id: "gear",
	name: "Gear",
	keywords: ["gear", "cog", "settings", "wheel", "mechanic"],
	params: GEAR_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const cx = width / 2;
		const cy = height / 2;
		const outer = Math.max(1, Math.min(width, height) / 2 - inset);
		const teeth = Math.max(
			3,
			Math.min(24, Math.round(Number(params.teeth ?? 8))),
		);
		const depth =
			Math.min(50, Math.max(5, Number(params.toothDepth ?? 25))) / 100;
		const inner = outer * (1 - depth);
		const holePercent =
			Math.min(80, Math.max(0, Number(params.hole ?? 35))) / 100;
		// Each tooth spans 4 sample points (root, rise, tip, fall).
		const steps = teeth * 4;
		const toothFraction = 0.5;

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		for (let i = 0; i < steps; i++) {
			const segment = i % 4;
			const radius = segment === 1 || segment === 2 ? outer : inner;
			const angle = (i / steps) * Math.PI * 2 - Math.PI / 2;
			// Bias tip width using toothFraction by nudging tip samples together.
			const bias =
				segment === 1
					? -((1 - toothFraction) * Math.PI) / steps
					: segment === 2
						? ((1 - toothFraction) * Math.PI) / steps
						: 0;
			const x = cx + Math.cos(angle + bias) * radius;
			const y = cy + Math.sin(angle + bias) * radius;
			if (i === 0) path.moveTo(x, y);
			else path.lineTo(x, y);
		}
		path.closePath();
		if (holePercent > 0) {
			const holeR = outer * holePercent;
			path.moveTo(cx + holeR, cy);
			path.arc(cx, cy, holeR, 0, Math.PI * 2, true);
		}
		ctx.fillStyle = fill;
		ctx.fill(path, "evenodd");

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
