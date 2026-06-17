import type { ParamDefinition } from "@/lib/params";

export type GraphicStrokeAlign = "inside" | "center" | "outside";

export const STROKE_ALIGN_PARAM: ParamDefinition<"strokeAlign"> = {
	key: "strokeAlign",
	label: "Stroke align",
	type: "select",
	default: "center",
	group: "stroke",
	options: [
		{ value: "inside", label: "Inside" },
		{ value: "center", label: "Center" },
		{ value: "outside", label: "Outside" },
	],
};

/** Standard fill colour param shared by every shape. */
export const FILL_PARAM: ParamDefinition = {
	key: "fill",
	label: "Fill",
	type: "color",
	default: "#ffffff",
};

/** Standard border (stroke) params shared by every shape — colour, width and
 * alignment, exactly like Alight Motion's "Border" controls. */
export const STROKE_PARAMS: ParamDefinition[] = [
	{
		key: "stroke",
		label: "Color",
		type: "color",
		default: "#000000",
		group: "stroke",
	},
	{
		key: "strokeWidth",
		label: "Width",
		type: "number",
		default: 0,
		min: 0,
		max: 64,
		step: 1,
		shortLabel: "W",
		group: "stroke",
	},
	STROKE_ALIGN_PARAM,
];

export interface ShapeBaseStyle {
	fill: string;
	stroke: string;
	strokeWidth: number;
	strokeAlign: GraphicStrokeAlign;
	/** Half the stroke width when centre-aligned, so the shape stays inside its
	 * bounds; zero otherwise. */
	inset: number;
}

/** Reads the common fill/stroke params shared by every shape. */
export function readShapeBaseStyle(params: {
	fill?: unknown;
	stroke?: unknown;
	strokeWidth?: unknown;
	strokeAlign?: unknown;
}): ShapeBaseStyle {
	const strokeWidth = Math.max(0, Number(params.strokeWidth ?? 0));
	const strokeAlign = (params.strokeAlign ?? "center") as GraphicStrokeAlign;
	return {
		fill: String(params.fill ?? "#ffffff"),
		stroke: String(params.stroke ?? "#000000"),
		strokeWidth,
		strokeAlign,
		inset: strokeAlign === "center" ? strokeWidth / 2 : 0,
	};
}

interface Point {
	x: number;
	y: number;
}

function normalize(point: Point): Point {
	const length = Math.hypot(point.x, point.y) || 1;
	return { x: point.x / length, y: point.y / length };
}

function distance(a: Point, b: Point): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Traces a closed polygon through `vertices` with rounded corners of the given
 * radius (0 = sharp). Works for convex and concave polygons, so it powers the
 * plus/cross, triangle and arrow shapes as well as regular polygons.
 */
export function traceRoundedPath({
	path,
	vertices,
	radius,
}: {
	path: Path2D;
	vertices: Point[];
	radius: number;
}): void {
	if (vertices.length < 3) {
		return;
	}

	if (radius <= 0) {
		path.moveTo(vertices[0].x, vertices[0].y);
		for (let index = 1; index < vertices.length; index++) {
			path.lineTo(vertices[index].x, vertices[index].y);
		}
		path.closePath();
		return;
	}

	for (let index = 0; index < vertices.length; index++) {
		const previous = vertices[(index - 1 + vertices.length) % vertices.length];
		const current = vertices[index];
		const next = vertices[(index + 1) % vertices.length];
		const toPrevious = normalize({
			x: previous.x - current.x,
			y: previous.y - current.y,
		});
		const toNext = normalize({ x: next.x - current.x, y: next.y - current.y });
		const maxOffset =
			Math.min(distance(previous, current), distance(current, next)) / 2;
		const angle = Math.acos(
			Math.max(
				-1,
				Math.min(1, toPrevious.x * toNext.x + toPrevious.y * toNext.y),
			),
		);
		const tangentOffset = Math.min(
			radius / Math.tan(Math.max(0.0001, angle) / 2),
			maxOffset,
		);
		const start = {
			x: current.x + toPrevious.x * tangentOffset,
			y: current.y + toPrevious.y * tangentOffset,
		};
		const end = {
			x: current.x + toNext.x * tangentOffset,
			y: current.y + toNext.y * tangentOffset,
		};

		if (index === 0) {
			path.moveTo(start.x, start.y);
		} else {
			path.lineTo(start.x, start.y);
		}
		path.arcTo(current.x, current.y, end.x, end.y, Math.min(radius, maxOffset));
	}

	path.closePath();
}
