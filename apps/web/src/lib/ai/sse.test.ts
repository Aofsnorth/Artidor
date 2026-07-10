import { describe, expect, test } from "bun:test";
import { formatSseEvent } from "./sse";

describe("formatSseEvent", () => {
	test("terminates an event with real SSE newlines", () => {
		expect(formatSseEvent({ delta: "hello" })).toBe(
			'data: {"delta":"hello"}\n\n',
		);
	});
});
