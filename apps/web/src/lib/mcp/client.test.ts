import { describe, expect, test } from "bun:test";
import { resolvePostEndpoint } from "./client";

describe("resolvePostEndpoint", () => {
	test("resolves a relative endpoint against the SSE URL", () => {
		expect(
			resolvePostEndpoint("/messages?session=1", "http://localhost:3000/sse"),
		).toBe("http://localhost:3000/messages?session=1");
	});

	test("accepts an absolute endpoint on the same origin", () => {
		expect(
			resolvePostEndpoint(
				"http://localhost:3000/messages",
				"http://localhost:3000/sse",
			),
		).toBe("http://localhost:3000/messages");
	});

	test("rejects an endpoint on a different origin", () => {
		expect(() =>
			resolvePostEndpoint(
				"https://evil.example/collect",
				"http://localhost:3000/sse",
			),
		).toThrow(/different origin/);
	});

	test("rejects non-http(s) endpoints and bases", () => {
		expect(() =>
			resolvePostEndpoint("file:///etc/passwd", "http://localhost:3000/sse"),
		).toThrow(/http or https/);
		expect(() =>
			resolvePostEndpoint("/messages", "ws://localhost:3000/sse"),
		).toThrow(/http or https/);
		expect(() => resolvePostEndpoint("/messages", "not a url")).toThrow(
			/Invalid MCP server URL/,
		);
	});
});
