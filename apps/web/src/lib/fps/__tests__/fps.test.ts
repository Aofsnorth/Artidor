import { describe, expect, test } from "bun:test";
import {
	floatToFrameRate,
	getHighestImportedVideoFps,
	getRaisedProjectFpsForImportedMedia,
} from "@/lib/fps/utils";

describe("floatToFrameRate", () => {
	test("maps usable frame rates as before", () => {
		expect(floatToFrameRate(24)).toEqual({ numerator: 24, denominator: 1 });
		expect(floatToFrameRate(29.97)).toEqual({
			numerator: 30_000,
			denominator: 1_001,
		});
	});

	test("rejects zero, negative and non-finite fps with a safe default", () => {
		for (const fps of [0, -1, -29.97, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(floatToFrameRate(fps), String(fps)).toEqual({
				numerator: 30,
				denominator: 1,
			});
		}
	});
});

describe("getHighestImportedVideoFps", () => {
	test("returns the highest valid video fps", () => {
		expect(
			getHighestImportedVideoFps({
				mediaAssets: [
					{ type: "audio" },
					{ type: "video", fps: 30 },
					{ type: "image", fps: 120 },
					{ type: "video", fps: 60 },
				],
			}),
		).toBe(60);
	});

	test("ignores missing and invalid fps values", () => {
		expect(
			getHighestImportedVideoFps({
				mediaAssets: [
					{ type: "video" },
					{ type: "video", fps: 0 },
					{ type: "video", fps: -10 },
					{ type: "audio", fps: 120 },
				],
			}),
		).toBeNull();
	});
});

describe("getRaisedProjectFpsForImportedMedia", () => {
	test("raises the project fps to match a higher-fps import", () => {
		expect(
			getRaisedProjectFpsForImportedMedia({
				currentFps: { numerator: 30, denominator: 1 },
				importedAssets: [{ type: "video", fps: 60 }],
			}),
		).toEqual({ numerator: 60, denominator: 1 });
	});

	test("does not lower the project fps for lower-fps imports", () => {
		expect(
			getRaisedProjectFpsForImportedMedia({
				currentFps: { numerator: 60, denominator: 1 },
				importedAssets: [{ type: "video", fps: 10 }],
			}),
		).toBeNull();
	});

	test("ignores non-video imports", () => {
		expect(
			getRaisedProjectFpsForImportedMedia({
				currentFps: { numerator: 30, denominator: 1 },
				importedAssets: [
					{ type: "image", fps: 60 },
					{ type: "audio", fps: 120 },
				],
			}),
		).toBeNull();
	});
});
