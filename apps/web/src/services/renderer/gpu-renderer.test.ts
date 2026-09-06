import { describe, expect, test } from "bun:test";
import { isUnsupportedGpuSurfaceError } from "./gpu-renderer";

describe("GPU surface compatibility", () => {
	test("detects the Linux Chromium presentation failure @fast @regression", () => {
		expect(
			isUnsupportedGpuSurfaceError(
				new Error(
					"Failed to present frame: The output surface does not support the required texture format",
				),
			),
		).toBe(true);
	});

	test("keeps unrelated render failures retryable @fast", () => {
		expect(isUnsupportedGpuSurfaceError(new Error("GPU device is busy"))).toBe(
			false,
		);
	});
});
