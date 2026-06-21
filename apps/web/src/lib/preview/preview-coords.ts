export interface PreviewViewportGeometry {
	canvasHeight: number;
	canvasWidth: number;
	centerX: number;
	centerY: number;
	scale: number;
	viewportHeight: number;
	viewportWidth: number;
}

function getCanvasOrigin({ geometry }: { geometry: PreviewViewportGeometry }): {
	x: number;
	y: number;
} {
	return {
		x: geometry.viewportWidth / 2 - geometry.centerX * geometry.scale,
		y: geometry.viewportHeight / 2 - geometry.centerY * geometry.scale,
	};
}

export function screenToCanvas({
	clientX,
	clientY,
	geometry,
	viewportRect,
}: {
	clientX: number;
	clientY: number;
	geometry: PreviewViewportGeometry;
	viewportRect: DOMRect;
}): { x: number; y: number } {
	const overlayX = clientX - viewportRect.left;
	const overlayY = clientY - viewportRect.top;

	return {
		x:
			geometry.centerX +
			(overlayX - geometry.viewportWidth / 2) / geometry.scale,
		y:
			geometry.centerY +
			(overlayY - geometry.viewportHeight / 2) / geometry.scale,
	};
}

export function canvasToOverlay({
	canvasX,
	canvasY,
	geometry,
}: {
	canvasX: number;
	canvasY: number;
	geometry: PreviewViewportGeometry;
}): { x: number; y: number } {
	const canvasOrigin = getCanvasOrigin({ geometry });

	return {
		x: canvasOrigin.x + canvasX * geometry.scale,
		y: canvasOrigin.y + canvasY * geometry.scale,
	};
}

export function positionToOverlay({
	positionX,
	positionY,
	geometry,
}: {
	positionX: number;
	positionY: number;
	geometry: PreviewViewportGeometry;
}): { x: number; y: number } {
	return canvasToOverlay({
		canvasX: geometry.canvasWidth / 2 + positionX,
		canvasY: geometry.canvasHeight / 2 + positionY,
		geometry,
	});
}

/**
 * Convert a canvas-logical point (0..canvasWidth, 0..canvasHeight) into the
 * 512x512 graphic source space, using the SAME contain-fit + centered mapping
 * the renderer applies to graphic elements (see element-bounds.ts /
 * graphic-node.ts). The 512² source is scaled by `min(w,h)/512` and centered,
 * so this is its inverse. Returns null when the canvas has no area.
 *
 * Drawing tools MUST use this (not a per-axis stretch from the origin) or the
 * committed path lands in a different place than the live preview.
 */
export function canvasLogicalToGraphicSource({
	canvasX,
	canvasY,
	canvasWidth,
	canvasHeight,
	sourceSize,
}: {
	canvasX: number;
	canvasY: number;
	canvasWidth: number;
	canvasHeight: number;
	sourceSize: number;
}): { x: number; y: number } | null {
	const containScale = Math.min(canvasWidth, canvasHeight) / sourceSize;
	if (containScale <= 0) return null;
	const half = sourceSize / 2;
	return {
		x: half + (canvasX - canvasWidth / 2) / containScale,
		y: half + (canvasY - canvasHeight / 2) / containScale,
	};
}

export function getDisplayScale({
	geometry,
}: {
	geometry: PreviewViewportGeometry;
}): { x: number; y: number } {
	return {
		x: geometry.scale,
		y: geometry.scale,
	};
}

export function screenPixelsToLogicalThreshold({
	geometry,
	screenPixels,
}: {
	geometry: PreviewViewportGeometry;
	screenPixels: number;
}): { x: number; y: number } {
	return {
		x: screenPixels / geometry.scale,
		y: screenPixels / geometry.scale,
	};
}
