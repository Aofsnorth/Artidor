/**
 * Gesture configuration for editor interactions.
 *
 * Two-finger gestures on trackpads (or touch devices) let the user rotate
 * or scale the selected element without affecting other elements. These
 * settings configure sensitivity and enable/disable individual gestures.
 */

export interface GestureConfig {
	/** Master toggle. When disabled, only single-pointer interactions work. */
	enabled: boolean;
	/** Rotation gesture (two-finger twist). */
	rotationEnabled: boolean;
	/** Pinch-to-zoom gesture (two-finger pinch). */
	pinchZoomEnabled: boolean;
	/** Pan gesture (two-finger drag). */
	panEnabled: boolean;
	/** Sensitivity multiplier for rotation. 1 = normal, <1 slower, >1 faster. */
	rotationSensitivity: number;
	/** Sensitivity multiplier for pinch-zoom. 1 = normal, <1 slower, >1 faster. */
	pinchSensitivity: number;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
	enabled: true,
	rotationEnabled: true,
	pinchZoomEnabled: true,
	panEnabled: true,
	rotationSensitivity: 1,
	pinchSensitivity: 1,
};

const GESTURE_CONFIG_STORAGE_KEY = "artidor:editor-gestures:v1";

export function loadGestureConfig(): GestureConfig {
	if (typeof window === "undefined") return DEFAULT_GESTURE_CONFIG;
	try {
		const raw = window.localStorage.getItem(GESTURE_CONFIG_STORAGE_KEY);
		if (!raw) return DEFAULT_GESTURE_CONFIG;
		const parsed = JSON.parse(raw);
		return { ...DEFAULT_GESTURE_CONFIG, ...parsed };
	} catch {
		return DEFAULT_GESTURE_CONFIG;
	}
}

export function saveGestureConfig({ config }: { config: GestureConfig }): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			GESTURE_CONFIG_STORAGE_KEY,
			JSON.stringify(config),
		);
	} catch {
		// ignore quota failures
	}
}
