import { describe, expect, test } from "bun:test";
import { createWavBlob } from "../mediabunny";

async function readHeader(blob: Blob): Promise<DataView> {
	return new DataView(await blob.arrayBuffer());
}

describe("createWavBlob", () => {
	test("writes the actual source sample rate, not a hardcoded 44100", async () => {
		const blob = await createWavBlob({
			samples: new Float32Array(4),
			sampleRate: 48_000,
			channels: 2,
		});
		const view = await readHeader(blob);
		expect(view.getUint16(22, true)).toBe(2);
		expect(view.getUint32(24, true)).toBe(48_000);
		expect(view.getUint32(28, true)).toBe(48_000 * 2 * 2);
		expect(view.getUint32(40, true)).toBe(8);
	});

	test("writes a mono 16 kHz header with half the payload", async () => {
		const blob = await createWavBlob({
			samples: new Float32Array(4),
			sampleRate: 16_000,
			channels: 1,
		});
		const view = await readHeader(blob);
		expect(view.getUint16(22, true)).toBe(1);
		expect(view.getUint32(24, true)).toBe(16_000);
		expect(view.getUint32(28, true)).toBe(16_000 * 2);
		expect(view.getUint32(40, true)).toBe(8);
	});
});
