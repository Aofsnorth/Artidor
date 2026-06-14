/**
 * Rendering types — types for transforms, blend modes, and 3D extensions.
 *
 * `Transform3D` extends the basic 2D `Transform` with depth (Z) and 3-axis
 * rotation, used by Blurrr/Alight Motion style 3D layers. Elements that
 * don't need 3D can stick with `Transform`.
 */

export interface Transform {
	scaleX: number;
	scaleY: number;
	position: {
		x: number;
		y: number;
	};
	/**
	 * Pivot point as a 0-1 fraction of the element's own bounds. (0.5, 0.5) is
	 * the visual center and is the default; (0, 0) is the top-left corner, etc.
	 * Used as the origin for `rotate` and `scaleX`/`scaleY`. Optional so
	 * legacy elements without a pivot default to center.
	 */
	pivot?: { x: number; y: number };
	/** Depth (Z) position in scene units. Positive = closer to camera. */
	positionZ?: number;
	rotate: number;
}

export const DEFAULT_PIVOT: { x: number; y: number } = { x: 0.5, y: 0.5 };

export function resolvePivot({
	transform,
}: {
	transform: Transform;
}): { x: number; y: number } {
	return transform.pivot ?? DEFAULT_PIVOT;
}

export const DEFAULT_TRANSFORM_PERSPECTIVE = 800;

export function getTransformPerspectiveScale({
	positionZ = 0,
	perspective = DEFAULT_TRANSFORM_PERSPECTIVE,
}: {
	positionZ?: number;
	perspective?: number;
}): number {
	const safePerspective = Math.max(1, perspective);
	const distance = Math.max(1, safePerspective - positionZ);
	return safePerspective / distance;
}

export interface Transform3D extends Transform {
	/** Depth (Z) position in scene units. Positive = closer to camera. */
	positionZ: number;
	/** 3D rotation around the X axis (pitch), in degrees. */
	rotateX: number;
	/** 3D rotation around the Y axis (yaw), in degrees. */
	rotateY: number;
	/** Perspective depth used when projecting this layer to screen. */
	perspective?: number;
}

export type BlendMode =
	| "normal"
	| "darken"
	| "multiply"
	| "color-burn"
	| "lighten"
	| "screen"
	| "plus-lighter"
	| "color-dodge"
	| "overlay"
	| "soft-light"
	| "hard-light"
	| "difference"
	| "exclusion"
	| "hue"
	| "saturation"
	| "color"
	| "luminosity";

/**
 * A scene-level 3D camera. When present, the renderer applies a perspective
 * projection that affects all layers (Blurrr's 3D camera). Animatable so
 * you can keyframe camera moves.
 */
export interface Camera3D {
	enabled: boolean;
	position: { x: number; y: number; z: number };
	rotation: { x: number; y: number; z: number };
	/** Field of view in degrees (default 50). */
	fov: number;
	/** Target the camera looks at (default 0,0,0). */
	target: { x: number; y: number; z: number };
}

export function isTransform3D(
	transform: Transform | Transform3D,
): transform is Transform3D {
	return (
		"positionZ" in transform &&
		typeof (transform as Transform3D).positionZ === "number"
	);
}

export function defaultTransform3D(): Transform3D {
	return {
		scaleX: 1,
		scaleY: 1,
		position: { x: 0, y: 0 },
		positionZ: 0,
		rotate: 0,
		rotateX: 0,
		rotateY: 0,
		perspective: 800,
	};
}

export function defaultCamera3D(): Camera3D {
	return {
		enabled: false,
		position: { x: 0, y: 0, z: 0 },
		rotation: { x: 0, y: 0, z: 0 },
		fov: 50,
		target: { x: 0, y: 0, z: 0 },
	};
}

/**
 * Project a 3D position to 2D screen coordinates using a simple
 * perspective model. Used for rendering and selection in the preview.
 */
export function project3DToScreen({
	point,
	camera,
	canvasWidth,
	canvasHeight,
}: {
	point: { x: number; y: number; z: number };
	camera: Camera3D;
	canvasWidth: number;
	canvasHeight: number;
}): { x: number; y: number } {
	const fovRad = (camera.fov * Math.PI) / 180;
	const distance = camera.position.z - point.z;
	if (distance <= 0) {
		return { x: canvasWidth / 2, y: canvasHeight / 2 };
	}
	const scale = 1 / Math.tan(fovRad / 2);
	const sx = (point.x - camera.position.x) * scale * (canvasWidth / 2) / distance;
	const sy = (point.y - camera.position.y) * scale * (canvasHeight / 2) / distance;
	return {
		x: canvasWidth / 2 + sx,
		y: canvasHeight / 2 + sy,
	};
}
