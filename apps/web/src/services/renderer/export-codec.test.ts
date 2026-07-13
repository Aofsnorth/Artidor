import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { negotiateVideoCodec } from "./export-codec";

const base = {
	format: "mp4" as const,
	quality: "high" as const,
	width: 1920,
	height: 1080,
	fpsFloat: 30,
};

describe("negotiateVideoCodec", () => {
	beforeEach(() => {
		(
			globalThis as unknown as { VideoEncoder: typeof VideoEncoder }
		).VideoEncoder = {
			isConfigSupported: () => Promise.resolve({ supported: true }),
		} as unknown as typeof VideoEncoder;
	});

	it("caches result per input combination", async () => {
		const mock = spyOn(VideoEncoder, "isConfigSupported");

		await negotiateVideoCodec(base);
		await negotiateVideoCodec(base);

		// The first call probes the preferred codec; the second call should
		// reuse the cached promise without any further negotiation.
		expect(mock).toHaveBeenCalledTimes(1);
	});

	it("does not share cache across different inputs", async () => {
		const mock = spyOn(VideoEncoder, "isConfigSupported");

		await negotiateVideoCodec({ ...base, width: 1280, height: 720 });
		await negotiateVideoCodec({ ...base, width: 3840, height: 2160 });

		expect(mock).toHaveBeenCalledTimes(2);
	});
});
