import { describe, expect, test } from "bun:test";
import { createRandomAccessWritableStream } from "./export-output";

describe("createRandomAccessWritableStream", () => {
	test("writes mediabunny chunks at their requested file positions", async () => {
		const operations: string[] = [];
		const file = {
			seek: async (position: number) => {
				operations.push(`seek:${position}`);
			},
			write: async (data: Uint8Array) => {
				operations.push(`write:${Array.from(data).join(",")}`);
			},
			close: async () => {
				operations.push("close");
			},
		};
		const stream = createRandomAccessWritableStream(file);
		const writer = stream.getWriter();
		await writer.write({
			type: "write",
			position: 8,
			data: new Uint8Array([1, 2]),
		});
		await writer.close();

		expect(operations).toEqual(["seek:8", "write:1,2", "close"]);
	});
});
