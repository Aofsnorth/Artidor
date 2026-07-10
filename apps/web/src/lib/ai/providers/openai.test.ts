import { afterEach, describe, expect, test } from "bun:test";
import { OpenAIProvider } from "./openai";

const originalFetch = globalThis.fetch;
const streamResponse = [
	'data: {"choices":[{"delta":{"content":"Hel"}}]}',
	'data: {"choices":[{"delta":{"content":"lo"}}]}',
	'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
	"data: [DONE]",
].join("\n\n");

type FetchMock = typeof globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("OpenAIProvider.chatStream", () => {
	test("requests upstream streaming and yields each text delta", async () => {
		let requestBody: { stream?: boolean } = {};
		const mockFetch = Object.assign(
			async (_input: RequestInfo | URL, init?: RequestInit) => {
				requestBody = JSON.parse(
					typeof init?.body === "string" ? init.body : "{}",
				) as { stream?: boolean };
				return new Response(`${streamResponse}\n\n`, {
					headers: { "content-type": "text/event-stream" },
				});
			},
			{ preconnect: originalFetch.preconnect },
		) satisfies FetchMock;
		globalThis.fetch = mockFetch;

		const chunks: string[] = [];
		const provider = new OpenAIProvider({
			provider: "openai",
			model: "test-model",
			apiKey: "test-key",
			baseUrl: "https://example.test",
		});

		for await (const event of provider.chatStream({
			messages: [{ role: "user", content: "Hi" }],
		})) {
			if (event.type === "delta") chunks.push(event.delta);
		}

		expect(requestBody.stream).toBe(true);
		expect(chunks).toEqual(["Hel", "lo"]);
	});

	test("allows a local OpenAI-compatible endpoint without an API key", async () => {
		let authorization: string | null = "";
		const mockFetch = Object.assign(
			async (_input: RequestInfo | URL, init?: RequestInit) => {
				authorization = new Headers(init?.headers).get("authorization");
				return new Response(
					'data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n',
					{ headers: { "content-type": "text/event-stream" } },
				);
			},
			{ preconnect: originalFetch.preconnect },
		) satisfies FetchMock;
		globalThis.fetch = mockFetch;

		const provider = new OpenAIProvider({
			provider: "openai",
			model: "local-model",
			baseUrl: "http://localhost:1234",
		});

		const chunks: string[] = [];
		for await (const event of provider.chatStream({
			messages: [{ role: "user", content: "Hi" }],
		})) {
			if (event.type === "delta") chunks.push(event.delta);
		}

		expect(authorization).toBeNull();
		expect(chunks).toEqual(["ok"]);
	});
});
