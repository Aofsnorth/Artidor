import { describe, expect, test } from "bun:test";
import { resolveDecodedFrameCacheLimit } from "./service";

describe("video cache canvas retention", () => {
	test("disables raw frame retention when CanvasSink reuses pooled canvases", () => {
		expect(
			resolveDecodedFrameCacheLimit({
				poolSize: 12,
				desiredLimit: 128,
			}),
		).toBe(0);
	});

	test("allows raw frame retention when CanvasSink pooling is disabled", () => {
		expect(
			resolveDecodedFrameCacheLimit({
				poolSize: 0,
				desiredLimit: 128,
			}),
		).toBe(128);
	});
});
