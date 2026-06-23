/**
 * 3D Camera layer (Blurrr/Alight Motion feature).
 *
 * A camera is a special layer that defines the viewport into a 3D scene. All
 * 3D-aware layers project their position through the camera. The camera
 * itself has a 3D transform: position, target, rotation, focal length, depth
 * of field, and fog. We use a pinhole projection in our 2D renderer as a
 * simplification — the user sees a perspective-transformed 2D canvas.
 */
import type { ElementRef, BaseTimelineElement } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";
import type { Transform } from "@/lib/rendering";
import type { ElementAnimations } from "@/lib/animation/types";

export interface CameraElement extends BaseTimelineElement {
	id: string;
	elementId?: string;
	name: string;
	type: "camera";
	trackId: string;
	startTime: number;
	duration: number;
	trimStart: number;
	trimEnd: number;
	hidden: boolean;

	/** 3D position of the camera in world space. */
	position3D: { x: number; y: number; z: number };
	/** Point the camera is looking at. */
	target3D: { x: number; y: number; z: number };
	/** Up vector (almost always (0, 1, 0)). */
	up3D: { x: number; y: number; z: number };
	/** Field of view in degrees. */
	fov: number;
	/** Near clip plane. */
	near: number;
	/** Far clip plane. */
	far: number;
	/** Depth of field strength (0 = no DOF, 1 = strong). */
	dofStrength: number;
	/** Focus distance (in world units). */
	focusDistance: number;
	/** Fog strength (0 = no fog, 1 = full fog). */
	fogStrength: number;
	/** Fog start distance. */
	fogStart: number;
	/** Fog end distance. */
	fogEnd: number;
	/** Camera roll (rotation around view axis). */
	roll: number;

	transform: Transform;
	animations?: ElementAnimations;
}

export type { ElementRef };

export interface CameraAnimations {
	channels: Record<
		| "position3D.x"
		| "position3D.y"
		| "position3D.z"
		| "target3D.x"
		| "target3D.y"
		| "target3D.z"
		| "fov"
		| "dofStrength"
		| "fogStrength",
		{ keyframes: Array<{ time: number; value: number }> }
	>;
}

export const DEFAULT_CAMERA_ELEMENT = {
	fov: 60,
	near: 0.1,
	far: 1000,
	dofStrength: 0,
	focusDistance: 5,
	fogStrength: 0,
	fogStart: 10,
	fogEnd: 100,
	roll: 0,
	position3D: { x: 0, y: 0, z: 5 },
	target3D: { x: 0, y: 0, z: 0 },
	up3D: { x: 0, y: 1, z: 0 },
} as const;

export function buildCameraElement({
	trackId,
	startTime = 0,
	duration,
}: {
	trackId: string;
	startTime?: number;
	duration: number;
}): Omit<CameraElement, "elementId"> {
	return {
		id: generateUUID(),
		name: "Camera",
		type: "camera",
		trackId,
		startTime,
		duration,
		trimStart: 0,
		trimEnd: 0,
		hidden: false,
		transform: {
			scaleX: 1,
			scaleY: 1,
			position: { x: 0, y: 0 },
			rotate: 0,
		},
		...DEFAULT_CAMERA_ELEMENT,
	};
}

/**
 * Compute the world-space 2D transform of a child layer given a camera
 * configuration. The camera matrix projects the child position into
 * normalized 2D space (with perspective).
 */
export function projectToCamera({
	childWorldPosition3D,
	camera,
	canvasSize,
}: {
	childWorldPosition3D: { x: number; y: number; z: number };
	camera: CameraElement;
	canvasSize: { width: number; height: number };
}): { x: number; y: number; depth: number; inFrame: boolean } {
	const fovRad = (camera.fov * Math.PI) / 180;
	const aspect = canvasSize.width / canvasSize.height;
	const focal = 1 / Math.tan(fovRad / 2);

	// View matrix: subtract camera position, then look-at rotation.
	const rel = {
		x: childWorldPosition3D.x - camera.position3D.x,
		y: childWorldPosition3D.y - camera.position3D.y,
		z: childWorldPosition3D.z - camera.position3D.z,
	};

	// Forward axis: from camera position to target.
	const forward = normalize3D({
		x: camera.target3D.x - camera.position3D.x,
		y: camera.target3D.y - camera.position3D.y,
		z: camera.target3D.z - camera.position3D.z,
	});
	const right = normalize3D(cross3D(forward, camera.up3D));
	const up = cross3D(right, forward);

	// Project rel onto camera axes.
	const viewX = dot3D(rel, right);
	const viewY = dot3D(rel, up);
	const viewZ = -dot3D(rel, forward);

	// Behind the camera = not in frame.
	if (viewZ >= camera.near) {
		return { x: 0, y: 0, depth: 1, inFrame: false };
	}

	// Perspective projection.
	const ndcX = (focal * viewX) / Math.max(0.001, -viewZ) / aspect;
	const ndcY = (focal * viewY) / Math.max(0.001, -viewZ);

	// Map NDC to canvas pixel space.
	const x = (ndcX + 1) * 0.5 * canvasSize.width;
	const y = (1 - (ndcY + 1) * 0.5) * canvasSize.height;
	const depth = -viewZ;

	return { x, y, depth, inFrame: true };
}

function normalize3D(v: { x: number; y: number; z: number }): {
	x: number;
	y: number;
	z: number;
} {
	const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
	return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross3D(
	a: { x: number; y: number; z: number },
	b: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x,
	};
}

function dot3D(
	a: { x: number; y: number; z: number },
	b: { x: number; y: number; z: number },
): number {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Apply fog to an alpha value based on distance from the camera.
 */
export function applyFog({
	distance,
	camera,
}: {
	distance: number;
	camera: CameraElement;
}): number {
	if (camera.fogStrength <= 0) return 1;
	if (distance < camera.fogStart) return 1;
	if (distance > camera.fogEnd) return 1 - camera.fogStrength;
	const t = (distance - camera.fogStart) / (camera.fogEnd - camera.fogStart);
	return 1 - camera.fogStrength * t;
}

/**
 * Apply depth of field blur radius based on distance from focus plane.
 */
export function applyDof({
	distance,
	camera,
}: {
	distance: number;
	camera: CameraElement;
}): number {
	if (camera.dofStrength <= 0) return 0;
	const diff = Math.abs(distance - camera.focusDistance);
	return diff * camera.dofStrength;
}
