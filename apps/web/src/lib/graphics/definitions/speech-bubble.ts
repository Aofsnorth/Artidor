import type { ParamDefinition } from "@/lib/params";
import { applyAlignedStroke } from "../stroke";
import { fillShapePath } from "../fill";
import {
	FILL_PARAM,
	STROKE_PARAMS,
	readShapeBaseStyle,
	traceRoundedPath,
} from "./shared";
import type { GraphicDefinition } from "../types";

const SPEECH_BUBBLE_PARAMS: ParamDefinition[] = [
	FILL_PARAM,
	...STROKE_PARAMS,
	{
		key: "cornerRadius",
		label: "Corner radius",
		type: "number",
		default: 24,
		min: 0,
		max: 50,
		step: 1,
		shortLabel: "R",
	},
	{
		key: "tailSize",
		label: "Tail size",
		type: "number",
		default: 40,
		min: 0,
		max: 100,
		step: 1,
		unit: "percent",
		shortLabel: "T",
	},
];

export const speechBubbleGraphicDefinition: GraphicDefinition = {
	id: "speech-bubble",
	name: "Speech Bubble",
	keywords: ["speech", "bubble", "chat", "message", "talk", "callout"],
	params: SPEECH_BUBBLE_PARAMS,
	render({ ctx, params, width, height }) {
		const { fill, stroke, strokeWidth, strokeAlign, inset } =
			readShapeBaseStyle(params);
		const x = inset;
		const y = inset;
		const w = Math.max(1, width - inset * 2);
		const h = Math.max(1, height - inset * 2);
		const tail =
			(Math.min(100, Math.max(0, Number(params.tailSize ?? 40))) / 100) *
			(h * 0.22);
		const bodyBottom = y + h - tail;

		const vertices = [
			{ x, y },
			{ x: x + w, y },
			{ x: x + w, y: bodyBottom },
			{ x: x + w * 0.42, y: bodyBottom },
			{ x: x + w * 0.2, y: y + h },
			{ x: x + w * 0.3, y: bodyBottom },
			{ x, y: bodyBottom },
		];
		const radiusPercent = Math.max(
			0,
			Math.min(50, Number(params.cornerRadius ?? 24)),
		);
		const radius = (Math.min(w, h * 0.6) / 2) * (radiusPercent / 50);

		ctx.clearRect(0, 0, width, height);
		const path = new Path2D();
		traceRoundedPath({ path, vertices, radius });
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
