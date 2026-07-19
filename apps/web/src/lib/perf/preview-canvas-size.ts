export function resizePreviewCanvasBackingStore({
	canvas,
	width,
	height,
}: {
	canvas: Pick<HTMLCanvasElement, "width" | "height">;
	width: number;
	height: number;
}): boolean {
	const nextWidth = Math.max(2, Math.round(width));
	const nextHeight = Math.max(2, Math.round(height));
	if (canvas.width === nextWidth && canvas.height === nextHeight) return false;
	canvas.width = nextWidth;
	canvas.height = nextHeight;
	return true;
}
