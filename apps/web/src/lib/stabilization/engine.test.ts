import { describe, expect, test } from "bun:test";
import { scaleProxyOffsetsToSource } from "./engine";

describe("scaleProxyOffsetsToSource", () => {
	test("scales 128px-proxy motion up to source pixels", () => {
		const scaled = scaleProxyOffsetsToSource({
			offsetX: -2,
			offsetY: 1.5,
			proxyWidth: 128,
			proxyHeight: 72,
			sourceWidth: 1920,
			sourceHeight: 1080,
		});
		expect(scaled.x).toBeCloseTo(-30, 6);
		expect(scaled.y).toBeCloseTo(22.5, 6);
	});

	test("guards against a zero-sized proxy", () => {
		const scaled = scaleProxyOffsetsToSource({
			offsetX: 1,
			offsetY: 1,
			proxyWidth: 0,
			proxyHeight: 0,
			sourceWidth: 100,
			sourceHeight: 50,
		});
		expect(scaled.x).toBe(100);
		expect(scaled.y).toBe(50);
	});
});
