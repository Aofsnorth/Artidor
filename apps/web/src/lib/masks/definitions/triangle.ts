import type { MaskDefinition, RectangleMaskParams } from "@/lib/masks/types";
import {
	BOX_LIKE_MASK_PARAMS,
	computeBoxMaskParamUpdate,
	getBoxLikeGeometry,
	getDefaultSquareMaskParams,
	getStrokeOffset,
	rotatePoint,
} from "./box-like";

function buildTrianglePath({
	centerX,
	centerY,
	halfWidth,
	halfHeight,
	rotationRad,
}: {
	centerX: number;
	centerY: number;
	halfWidth: number;
	halfHeight: number;
	rotationRad: number;
}): Path2D {
	const points = [
		{ x: centerX, y: centerY - halfHeight },
		{ x: centerX + halfWidth, y: centerY + halfHeight },
		{ x: centerX - halfWidth, y: centerY + halfHeight },
	].map((point) =>
		rotatePoint({
			...point,
			centerX,
			centerY,
			rotationRad,
		}),
	);

	const path = new Path2D();
	path.moveTo(points[0].x, points[0].y);
	path.lineTo(points[1].x, points[1].y);
	path.lineTo(points[2].x, points[2].y);
	path.closePath();
	return path;
}

export const triangleMaskDefinition: MaskDefinition<RectangleMaskParams> = {
	type: "triangle",
	name: "Triangle",
	overlayShape: "box",
	buildOverlayPath({ width, height }) {
		return `M ${width / 2},0 L ${width},${height} L 0,${height} Z`;
	},
	features: {
		hasPosition: true,
		hasRotation: true,
		sizeMode: "width-height",
	},
	params: BOX_LIKE_MASK_PARAMS,
	buildDefault(context) {
		return {
			type: "triangle",
			params: getDefaultSquareMaskParams(context),
		};
	},
	computeParamUpdate: computeBoxMaskParamUpdate,
	renderer: {
		buildPath({ resolvedParams, width, height }) {
			const params = resolvedParams as RectangleMaskParams;
			const { centerX, centerY, maskWidth, maskHeight, rotationRad } =
				getBoxLikeGeometry({ params, width, height });
			return buildTrianglePath({
				centerX,
				centerY,
				halfWidth: maskWidth / 2,
				halfHeight: maskHeight / 2,
				rotationRad,
			});
		},
		buildStrokePath({ resolvedParams, width, height }) {
			const params = resolvedParams as RectangleMaskParams;
			const { centerX, centerY, maskWidth, maskHeight, rotationRad } =
				getBoxLikeGeometry({ params, width, height });
			const offset = getStrokeOffset({
				strokeAlign: params.strokeAlign,
				strokeWidth: params.strokeWidth,
			});
			return buildTrianglePath({
				centerX,
				centerY,
				halfWidth: Math.max(maskWidth / 2 + offset, 1),
				halfHeight: Math.max(maskHeight / 2 + offset, 1),
				rotationRad,
			});
		},
	},
};
