import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import type { GraphicDefinition } from "../types";

const BURST_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "points",
		label: "Points",
		type: "number",
		default: 12,
		min: 4,
		max: 32,
		step: 1,
		shortLabel: "P",
	},
	{
		key: "depth",
		label: "Spike depth",
		type: "number",
		default: 22,
		min: 4,
		max: 60,
		step: 1,
		unit: "percent",
		shortLabel: "D",
	},
];

/**
 * A spiky sun/seal burst: like a star but with many shallow spikes. Distinct
 * from the existing `star` (few deep points) and great for sale badges.
 */
export const burstGraphicDefinition: GraphicDefinition = {
	id: "burst",
	name: "Burst",
	keywords: ["burst", "sun", "seal", "badge", "spikes", "sale"],
	params: BURST_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const cx = width / 2;
		const cy = height / 2;
		const outer = Math.max(1, Math.min(width, height) / 2 - inset);
		const points = Math.max(
			4,
			Math.min(32, Math.round(Number(params.points ?? 12))),
		);
		const depth = Math.min(60, Math.max(4, Number(params.depth ?? 22))) / 100;
		const inner = outer * (1 - depth);

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		for (let i = 0; i < points * 2; i++) {
			const radius = i % 2 === 0 ? outer : inner;
			const angle = -Math.PI / 2 + (i * Math.PI) / points;
			const x = cx + Math.cos(angle) * radius;
			const y = cy + Math.sin(angle) * radius;
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
