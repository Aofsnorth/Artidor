import { describe, expect, test } from "bun:test";
import {
	getFrameInterpolationCapabilities,
	resetFrameInterpolationCache,
} from "@/lib/frame-interpolation/capabilities";

describe("frame interpolation capabilities", () => {
	test("optical flow is available without WebGL2/WebGPU", async () => {
		resetFrameInterpolationCache();
		const capabilities = await getFrameInterpolationCapabilities();

		// The CPU optical-flow module is always importable, so the capability
		// must not be gated on a GPU backend.
		expect(capabilities.opticalFlow).toBe(true);
		expect(capabilities.blend).toBe(true);
		resetFrameInterpolationCache();
	});
});