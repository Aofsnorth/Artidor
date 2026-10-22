import { afterEach, describe, expect, test } from "bun:test";
import type { ChatRequest } from "../provider";
import { AnthropicProvider } from "./anthropic";

const originalFetch = globalThis.fetch;

function stubResponse(body: unknown): void {
	globalThis.fetch = (async () =>
		new Response(JSON.stringify(body), {
			status: 200,
			headers: { "content-type": "application/json" },
		})) as typeof fetch;
}

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function request(messages: ChatRequest["messages"]): ChatRequest {
	return { messages };
}

describe("AnthropicProvider system messages", () => {
	test("combines every system message instead of keeping only the first", async () => {
		let body: { system?: string; messages: unknown[] } | undefined;
		globalThis.fetch = (async (_url, init) => {
			body = JSON.parse(String(init?.body));
			return new Response(
				JSON.stringify({
					content: [{ type: "text", text: "ok" }],
					stop_reason: "end_turn",
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			);
		}) as typeof fetch;

		const provider = new AnthropicProvider({
			apiKey: "test-key",
			model: "claude-sonnet-4-5",
		});
		await provider.chat(
			request([
				{ role: "system", content: "Base system prompt." },
				{
					role: "system",
					content: [
						{ type: "text", text: "Summary of earlier conversation:" },
						{ type: "text", text: "user asked to add a title" },
					],
				},
				{ role: "user", content: "continue" },
			]),
		);

		expect(body?.system).toBe(
			"Base system prompt.\n\nSummary of earlier conversation:\nuser asked to add a title",
		);
		// System messages must not leak into the `messages` array.
		expect(body?.messages).toEqual([expect.objectContaining({ role: "user" })]);
	});

	test("omits the system field when there are no system messages", async () => {
		stubResponse({
			content: [{ type: "text", text: "ok" }],
			stop_reason: "end_turn",
		});
		const provider = new AnthropicProvider({
			apiKey: "test-key",
			model: "claude-sonnet-4-5",
		});
		const result = await provider.chat(
			request([{ role: "user", content: "hello" }]),
		);
		expect(result.message.content).toBe("ok");
	});
});
