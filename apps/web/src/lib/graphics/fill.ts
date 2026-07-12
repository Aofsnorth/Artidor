import { drawCssBackground } from "@/lib/gradients";

type AnyCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const GRADIENT_RE = /(^|\s)(repeating-)?(linear|radial)-gradient\s*\(/i;

/** True when `fill` is a CSS gradient string rather than a solid color. */
export function isGradientFill(fill: string): boolean {
	return GRADIENT_RE.test(fill);
}

/**
 * Fills `path` with either a solid color or a CSS gradient. Canvas `fillStyle`
 * cannot take a gradient *string*, so for gradients we clip to the path and
 * paint the gradient across the shape's bounds via `drawCssBackground` (the
 * same renderer used for backgrounds). Solid fills take the cheap direct path.
 */
export function fillShapePath({
	ctx,
	path,
	fill,
	width,
	height,
	fillRule,
}: {
	ctx: AnyCtx;
	path: Path2D;
	fill: string;
	width: number;
	height: number;
	/** Pass "evenodd" for shapes with holes (ring, gear, crescent). */
	fillRule?: CanvasFillRule;
}): void {
	if (isGradientFill(fill)) {
		ctx.save();
		ctx.clip(path, fillRule ?? "nonzero");
		drawCssBackground({ ctx, width, height, css: fill });
		ctx.restore();
		return;
	}
	ctx.fillStyle = fill;
	ctx.fill(path, fillRule ?? "nonzero");
}
