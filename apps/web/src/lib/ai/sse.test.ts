import { describe, expect, test } from "bun:test";
import { formatSseEvent, parseSseEventBlock, splitSseBuffer } from "./sse";

describe("formatSseEvent", () => {
	test("terminates an event with real SSE newlines", () => {
		expect(formatSseEvent({ delta: "hello" })).toBe(
			'data: {"delta":"hello"}\n\n',
		);
	});
});

describe("splitSseBuffer", () => {
	test("splits LF-delimited events and keeps the trailing partial", () => {
		expect(splitSseBuffer("data: 1\n\ndata: 2\n\ndata: par")).toEqual({
			events: ["data: 1", "data: 2"],
			rest: "data: par",
		});
	});

	test("normalizes CRLF event delimiters", () => {
		expect(splitSseBuffer("data: 1\r\n\r\ndata: 2\r\n\r\n")).toEqual({
			events: ["data: 1", "data: 2"],
			rest: "",
		});
	});
});

describe("parseSseEventBlock", () => {
	test("joins multi-line data fields with a newline", () => {
		expect(parseSseEventBlock('data: {"a":1,\ndata: "b":2}')).toBe(
			'{"a":1,\n"b":2}',
		);
	});

	test("ignores comments and non-data fields", () => {
		expect(parseSseEventBlock(": keep-alive\nevent: delta\ndata: hello")).toBe(
			"hello",
		);
	});

	test("returns null when a block has no data field", () => {
		expect(parseSseEventBlock(": keep-alive\nevent: ping")).toBeNull();
	});

	test("preserves a leading space only once", () => {
		expect(parseSseEventBlock("data:  two spaces")).toBe(" two spaces");
	});
});
