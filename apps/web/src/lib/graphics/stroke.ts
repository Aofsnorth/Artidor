import type {
	GraphicStrokeAlign,
	GraphicStrokeDash,
	GraphicStrokeTaper,
} from "./definitions/shared";

type GraphicRenderContext =
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D;

function createTempCanvas({
	width,
	height,
}: {
	width: number;
	height: number;
}): OffscreenCanvas | HTMLCanvasElement {
	try {
		return new OffscreenCanvas(width, height);
	} catch {
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		return canvas;
	}
}

function getStrokeDash({
	strokeDash,
	strokeWidth,
}: {
	strokeDash?: GraphicStrokeDash;
	strokeWidth: number;
}): number[] {
	if (strokeDash === "dashed") {
		const dashSize = Math.max(1, strokeWidth * 2);
		return [dashSize, dashSize];
	}
	if (strokeDash === "dotted") {
		return [Math.max(1, strokeWidth), Math.max(1, strokeWidth * 1.5)];
	}
	return [];
}

function applyStroke({
	ctx,
	path,
	strokeWidth,
	strokeColor,
	strokeOpacity,
	strokeDash,
	strokeTaper,
}: {
	ctx: GraphicRenderContext;
	path: Path2D;
	strokeWidth: number;
	strokeColor: string;
	strokeOpacity?: number;
	strokeDash?: GraphicStrokeDash;
	strokeTaper?: GraphicStrokeTaper;
}) {
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth =
		strokeTaper && strokeTaper !== "none"
			? Math.max(1, strokeWidth * 0.55)
			: strokeWidth;
	ctx.lineCap = strokeTaper && strokeTaper !== "none" ? "round" : ctx.lineCap;
	ctx.setLineDash(getStrokeDash({ strokeDash, strokeWidth }));

	if (strokeOpacity !== undefined && strokeOpacity < 1) {
		ctx.save();
		ctx.globalAlpha = Math.max(0, Math.min(1, strokeOpacity));
		ctx.stroke(path);
		ctx.restore();
		return;
	}
	ctx.stroke(path);
}

export function applyAlignedStroke({
	ctx,
	path,
	strokeWidth,
	strokeAlign,
	strokeColor,
	strokeOpacity,
	strokeDash,
	strokeTaper,
}: {
	ctx: GraphicRenderContext;
	path: Path2D;
	strokeWidth: number;
	strokeAlign: GraphicStrokeAlign;
	strokeColor: string;
	strokeOpacity?: number;
	strokeDash?: GraphicStrokeDash;
	strokeTaper?: GraphicStrokeTaper;
}): void {
	if (strokeWidth <= 0) {
		return;
	}

	if (strokeAlign === "inside") {
		ctx.save();
		ctx.clip(path);
		applyStroke({
			ctx,
			path,
			strokeWidth: strokeWidth * 2,
			strokeColor,
			strokeOpacity,
			strokeDash,
			strokeTaper,
		});
		ctx.restore();
		return;
	}

	if (strokeAlign === "outside") {
		const strokeCanvas = createTempCanvas({
			width: ctx.canvas.width,
			height: ctx.canvas.height,
		});
		const strokeCtx = strokeCanvas.getContext(
			"2d",
		) as GraphicRenderContext | null;
		if (!strokeCtx) {
			return;
		}

		applyStroke({
			ctx: strokeCtx,
			path,
			strokeWidth: strokeWidth * 2,
			strokeColor,
			strokeOpacity,
			strokeDash,
			strokeTaper,
		});

		// Keep only the outer half of the doubled stroke so alpha fills do not
		// leave a visible inner stroke behind.
		strokeCtx.globalCompositeOperation = "destination-out";
		strokeCtx.fill(path);

		ctx.drawImage(strokeCanvas, 0, 0);
		return;
	}

	applyStroke({
		ctx,
		path,
		strokeWidth,
		strokeColor,
		strokeOpacity,
		strokeDash,
		strokeTaper,
	});
}
