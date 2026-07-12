import { describe, expect, test } from "bun:test";
import {
	recommendExportWorkerCount,
	type HardwareInfo,
} from "./hardware";

const hardware = (overrides: Partial<HardwareInfo> = {}): HardwareInfo => ({
	cpuCores: 16,
	deviceMemoryGb: 8,
	gpuAdapter: { description: "Test GPU", vendor: "test", architecture: "" },
	...overrides,
});

describe("recommendExportWorkerCount", () => {
	test("keeps CPU/RAM policy for 1080p exports", () => {
		expect(
			recommendExportWorkerCount({
				hardware: hardware(),
				width: 1920,
				height: 1080,
			}),
		).toBe(4);
	});

	test("caps 4K exports to two WebGPU compositor workers", () => {
		expect(
			recommendExportWorkerCount({
				hardware: hardware(),
				width: 3840,
				height: 2160,
			}),
		).toBe(2);
	});

	test("uses one worker above 4K to avoid GPU memory contention", () => {
		expect(
			recommendExportWorkerCount({
				hardware: hardware(),
				width: 7680,
				height: 4320,
			}),
		).toBe(1);
	});

	test("uses one worker when WebGPU is unavailable", () => {
		expect(
			recommendExportWorkerCount({
				hardware: hardware({ gpuAdapter: null }),
				width: 1920,
				height: 1080,
			}),
		).toBe(1);
	});
});
