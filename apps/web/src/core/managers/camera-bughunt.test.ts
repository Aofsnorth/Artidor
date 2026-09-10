import { describe, expect, test } from "bun:test";
import {
	buildCameraElement,
	findActiveCamera,
	DEFAULT_CAMERA_ELEMENT,
} from "@/lib/camera";

/**
 * Panels bughunt regressions (camera flows — pure lib surface, no edits):
 * - multi-camera is INTENTIONAL (Alight Motion style): highest visible wins,
 *   hiding the first promotes the second, all-hidden yields null viewport;
 * - camera defaults stay sane (fov/near/far finite, near < far);
 * - single-sided clamp fix (camera-tab): near/far Infinity inputs are ignored
 *   at the UI layer (pinned via the parse-guard suite) — here we pin that the
 *   projection inputs stay finite for sane cameras.
 */
describe("camera flows", () => {
	function camera(id: string, hidden: boolean) {
		return {
			...buildCameraElement({ trackId: "t", duration: 100 }),
			id,
			hidden,
		};
	}

	test("highest visible camera wins; hiding promotes the next", () => {
		const a = camera("a", false);
		const b = camera("b", false);
		expect(findActiveCamera({ cameras: [a, b] })?.id).toBe("a");
		expect(findActiveCamera({ cameras: [{ ...a, hidden: true }, b] })?.id).toBe(
			"b",
		);
	});

	test("all cameras hidden yields null (default viewport)", () => {
		const a = camera("a", true);
		const b = camera("b", true);
		expect(findActiveCamera({ cameras: [a, b] })).toBeNull();
	});

	test("camera defaults are finite and sane", () => {
		expect(Number.isFinite(DEFAULT_CAMERA_ELEMENT.fov)).toBe(true);
		expect(DEFAULT_CAMERA_ELEMENT.fov).toBeGreaterThan(0);
		expect(DEFAULT_CAMERA_ELEMENT.fov).toBeLessThan(180);
		expect(DEFAULT_CAMERA_ELEMENT.near).toBeGreaterThan(0);
		expect(DEFAULT_CAMERA_ELEMENT.far).toBeGreaterThan(
			DEFAULT_CAMERA_ELEMENT.near,
		);
	});
});
