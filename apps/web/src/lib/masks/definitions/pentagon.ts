import type { MaskDefinition, RectangleMaskParams } from "@/lib/masks/types";
import {
	BOX_LIKE_MASK_PARAMS,
	computeBoxMaskParamUpdate,
	getBoxLikeGeometry,
	getDefaultSquareMaskParams,
	getStrokeOffset,
	rotatePoint,
} from "./box-like";

function buildPentagonPath({
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
	const path = new Path2D();

	for (let index = 0; index < 5; index++) {
		const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
		const point = rotatePoint({
			x: centerX + halfWidth * Math.cos(angle),
			y: centerY + halfHeight * Math.sin(angle),
			centerX,
			centerY,
			rotationRad,
		});

		if (index === 0) {
			path.moveTo(point.x, point.y);
		} else {
			path.lineTo(point.x, point.y);
		}
	}

	path.closePath();
	return path;
}

function buildOverlayPentagonPath({
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
	const segments: string[] = [];

	for (let index = 0; index < 5; index++) {
		const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
		const x = centerX + halfWidth * Math.cos(angle);
		const y = centerY + halfHeight * Math.sin(angle);
		segments.push(`${index === 0 ? "M" : "L"} ${x},${y}`);
	}

	return `${segments.join(" ")} Z`;
}

export const pentagonMaskDefinition: MaskDefinition<RectangleMaskParams> = {
	type: "pentagon",
	name: "Pentagon",
	overlayShape: "box",
	buildOverlayPath({ width, height }) {
		return buildOverlayPentagonPath({ width, height });
	},
	features: {
		hasPosition: true,
		hasRotation: true,
		sizeMode: "width-height",
	},
	params: BOX_LIKE_MASK_PARAMS,
	buildDefault(context) {
		return {
			type: "pentagon",
			params: getDefaultSquareMaskParams(context),
		};
	},
	computeParamUpdate: computeBoxMaskParamUpdate,
	renderer: {
		buildPath({ resolvedParams, width, height }) {
			const params = resolvedParams as RectangleMaskParams;
			const { centerX, centerY, maskWidth, maskHeight, rotationRad } =
				getBoxLikeGeometry({ params, width, height });
			return buildPentagonPath({
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
			return buildPentagonPath({
				centerX,
				centerY,
				halfWidth: Math.max(maskWidth / 2 + offset, 1),
				halfHeight: Math.max(maskHeight / 2 + offset, 1),
				rotationRad,
			});
		},
	},
};
