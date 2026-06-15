import type { MaskDefinition, RectangleMaskParams } from "@/lib/masks/types";
import {
	BOX_LIKE_MASK_PARAMS,
	computeBoxMaskParamUpdate,
	getBoxLikeGeometry,
	getDefaultSquareMaskParams,
	getStrokeOffset,
	rotatePoint,
} from "./box-like";

function buildArrowPath({
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
		{ x: centerX + halfWidth, y: centerY },
		{ x: centerX + halfWidth / 2, y: centerY },
		{ x: centerX + halfWidth / 2, y: centerY + halfHeight },
		{ x: centerX - halfWidth / 2, y: centerY + halfHeight },
		{ x: centerX - halfWidth / 2, y: centerY },
		{ x: centerX - halfWidth, y: centerY },
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
	for (let i = 1; i < points.length; i++) {
		path.lineTo(points[i].x, points[i].y);
	}
	path.closePath();
	return path;
}

function buildOverlayArrowPath({
	width,
	height,
}: {
	width: number;
	height: number;
}): string {
	const centerX = width / 2;
	const centerY = height / 2;
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const points = [
		{ x: centerX, y: centerY - halfHeight },
		{ x: centerX + halfWidth, y: centerY },
		{ x: centerX + halfWidth / 2, y: centerY },
		{ x: centerX + halfWidth / 2, y: centerY + halfHeight },
		{ x: centerX - halfWidth / 2, y: centerY + halfHeight },
		{ x: centerX - halfWidth / 2, y: centerY },
		{ x: centerX - halfWidth, y: centerY },
	];
	return (
		`M ${points[0].x},${points[0].y} ` +
		points
			.slice(1)
			.map((p) => `L ${p.x},${p.y}`)
			.join(" ") +
		" Z"
	);
}

export const arrowMaskDefinition: MaskDefinition<RectangleMaskParams> = {
	type: "arrow",
	name: "Arrow",
	overlayShape: "box",
	buildOverlayPath({ width, height }) {
		return buildOverlayArrowPath({ width, height });
	},
	features: {
		hasPosition: true,
		hasRotation: true,
		sizeMode: "width-height",
	},
	params: BOX_LIKE_MASK_PARAMS,
	buildDefault(context) {
		return {
			type: "arrow",
			params: getDefaultSquareMaskParams(context),
		};
	},
	computeParamUpdate: computeBoxMaskParamUpdate,
	renderer: {
		buildPath({ resolvedParams, width, height }) {
			const params = resolvedParams as RectangleMaskParams;
			const { centerX, centerY, maskWidth, maskHeight, rotationRad } =
				getBoxLikeGeometry({ params, width, height });
			return buildArrowPath({
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
			return buildArrowPath({
				centerX,
				centerY,
				halfWidth: Math.max(maskWidth / 2 + offset, 1),
				halfHeight: Math.max(maskHeight / 2 + offset, 1),
				rotationRad,
			});
		},
	},
};
