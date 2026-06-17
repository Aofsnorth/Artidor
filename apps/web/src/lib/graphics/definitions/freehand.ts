import type { GraphicDefinition } from "../types";
import { FILL_PARAM, STROKE_PARAMS, readShapeBaseStyle } from "./shared";
import { applyAlignedStroke } from "../stroke";

/**
 * Freehand drawing definition — stores an SVG path string as a "pathData"
 * param on the element (not in the definition's params array, so it's
 * hidden from the inspector). The path data is captured by the freehand
 * draw tool (useFreehandDraw hook) and stored as a string compatible
 * with `new Path2D(d)`.
 *
 * The inspector exposes fill, stroke, closed, and the Alight Motion-style
 * "Drawing Progress" effect (start/end percentages) that animates the
 * stroke being drawn on. The progress params are keyframable so the
 * user can animate `drawingProgressEnd` from 0 to 100 to draw the
 * path on screen. The visual clip uses a stroke-dasharray measured
 * off an offscreen SVGPathElement (browsers don't expose a
 * `getTotalLength()` on `Path2D`).
 */
export const freehandDefinition: GraphicDefinition = {
	id: "freehand",
	name: "Freehand",
	keywords: ["draw", "pen", "sketch", "freehand", "path", "stroke"],
	params: [
		FILL_PARAM,
		...STROKE_PARAMS,
		{
			key: "closed",
			type: "boolean",
			label: "Closed path",
			default: false,
		},
		{
			key: "drawingProgressStart",
			type: "number",
			label: "Progress Start",
			default: 0,
			min: 0,
			max: 100,
			step: 1,
			group: "drawing-progress",
		},
		{
			key: "drawingProgressEnd",
			type: "number",
			label: "Progress End",
			default: 100,
			min: 0,
			max: 100,
			step: 1,
			group: "drawing-progress",
		},
	],
	render({ ctx, params, width, height }) {
		ctx.clearRect(0, 0, width, height);

		const pathData = (params.pathData as string) ?? "";
		if (!pathData) return;

		const { fill, stroke, strokeWidth, strokeAlign } =
			readShapeBaseStyle(params);
		const strokeOpacity = clamp01(Number(params.strokeOpacity ?? 1));

		const path = new Path2D(pathData);

		// Drawing Progress: clip the visible portion of the path between
		// start (from the beginning) and end (from the end). Default
		// (0/100) renders the full path; animating end down to 0 produces
		// the "draw on" effect.
		const start = clampPct(Number(params.drawingProgressStart ?? 0));
		const end = clampPct(Number(params.drawingProgressEnd ?? 100));
		const totalLength = measureSvgPathLength({ d: pathData });
		const visible = Math.max(0, end - start) / 100;
		const offset = -(start / 100) * totalLength;
		const dashArray =
			totalLength > 0 ? `${visible * totalLength} ${totalLength}` : "";

		const closed = params.closed as boolean;
		if (closed && fill && start === 0 && end === 100) {
			ctx.fillStyle = fill;
			ctx.fill(path);
		}

		if (stroke && strokeWidth > 0) {
			ctx.save();
			if (dashArray) {
				ctx.setLineDash([visible * totalLength, totalLength]);
				ctx.lineDashOffset = offset;
			}
			applyAlignedStroke({
				ctx,
				path,
				strokeColor: stroke,
				strokeWidth,
				strokeAlign,
				strokeOpacity,
			});
			ctx.restore();
		}
	},
};

function clampPct(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, value));
}

function clamp01(value: number): number {
	if (!Number.isFinite(value)) return 1;
	return Math.max(0, Math.min(1, value));
}

/**
 * Estimate the length of an SVG path by walking an offscreen
 * SVGPathElement. Canvas2D doesn't expose a `getTotalLength()` on
 * Path2D, so we mirror the path through a temporary `<path>` and
 * call the SVG API instead. This is good enough for stroke-dasharray
 * trimming at preview rates.
 */
function measureSvgPathLength({ d }: { d: string }): number {
	if (typeof window === "undefined") return 0;
	const svgNS = "http://www.w3.org/2000/svg";
	const path = document.createElementNS(svgNS, "path");
	path.setAttribute("d", d);
	try {
		return path.getTotalLength();
	} catch {
		return 0;
	}
}
