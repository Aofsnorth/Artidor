import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";

// The manager's import graph pulls in timeline commands, which import
// `artidor-wasm`. Bun cannot instantiate the checked-in wasm build here, so
// stub the handful of wasm APIs that the graph references.
mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: 120_000,
	roundToFrame: ({ time }: { time: number }) => time,
	snappedSeekTime: ({ time }: { time: number }) => time,
	lastFrameTime: () => 0,
	mediaTimeToSeconds: (time: number) => time / 120_000,
	mediaTimeFromSeconds: (seconds: number) => Math.round(seconds * 120_000),
	formatTimecode: () => "0:00",
}));

// Puter chunks are driven by the test (the real client loads a browser SDK).
mock.module("@/lib/ai/puter-client", () => ({
	streamPuterChat: async function* () {
		yield { toolCalls: [{ id: "a", name: "one", arguments: { step: 1 } }] };
		yield { toolCalls: [{ id: "b", name: "two", arguments: {} }] };
		// Same id again: replaces the first entry instead of duplicating it.
		yield { toolCalls: [{ id: "a", name: "one", arguments: { step: 2 } }] };
		yield { done: true };
	},
	puterTxt2Vid: async () => "",
	puterTxt2Img: async () => "",
	puterTxt2Speech: async () => "",
}));

// The manager throttles streaming UI notifications through rAF, which Bun's
// test runtime does not provide. Run the callback immediately.
Object.defineProperty(globalThis, "requestAnimationFrame", {
	configurable: true,
	value: (callback: (time: number) => void) => {
		callback(0);
		return 1;
	},
});
Object.defineProperty(globalThis, "cancelAnimationFrame", {
	configurable: true,
	value: () => {},
});

const { AIManager, isRetryableHttpStatus } = await import("../ai-manager");
const { useAIStore } = await import("@/stores/ai-store");

const originalFetch = globalThis.fetch;

afterAll(() => {
	mock.restore();
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	useAIStore.setState({
		messages: [],
		status: "idle",
		error: null,
		retryCount: 0,
		retryIn: 0,
		revertSnapshots: {},
	});
});

function fakeEditor(overrides: Record<string, unknown> = {}): EditorCore {
	return {
		project: { getActive: () => null },
		scenes: { getActiveSceneOrNull: () => null },
		timeline: { getTotalDuration: () => 0 },
		...overrides,
	} as unknown as EditorCore;
}

interface StreamResult {
	kind: "ok" | "error";
	assistantId?: string;
	toolCalls?: unknown[];
	message?: string;
	retryable?: boolean;
}

interface ManagerInternals {
	streamLLMResponse(
		recent: unknown[],
		signal: AbortSignal,
		scope?: "project" | "global" | "off",
	): Promise<StreamResult>;
}

function stream(
	manager: AIManager,
	signal: AbortSignal,
): Promise<StreamResult> {
	return (manager as unknown as ManagerInternals).streamLLMResponse(
		[],
		signal,
		"off",
	);
}

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function sseResponse(chunks: string[]): Response {
	const encoder = new TextEncoder();
	return new Response(
		new ReadableStream<Uint8Array>({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
				controller.close();
			},
		}),
		{ status: 200, headers: { "content-type": "text/event-stream" } },
	);
}

describe("isRetryableHttpStatus", () => {
	test("retries only transient statuses", () => {
		for (const status of [408, 409, 429, 500, 502, 503, 504]) {
			expect(isRetryableHttpStatus(status)).toBe(true);
		}
		for (const status of [400, 401, 403, 404, 405, 422]) {
			expect(isRetryableHttpStatus(status)).toBe(false);
		}
	});
});

describe("streamLLMResponse retry classification", () => {
	test("a permanent 4xx is not retryable", async () => {
		globalThis.fetch = (async () =>
			jsonResponse(401, { message: "invalid api key" })) as typeof fetch;
		const result = await stream(
			new AIManager(fakeEditor()),
			new AbortController().signal,
		);
		expect(result.kind).toBe("error");
		expect(result.retryable).toBe(false);
	});

	test("429 and 5xx are retryable", async () => {
		for (const status of [429, 503]) {
			globalThis.fetch = (async () =>
				jsonResponse(status, { message: "busy" })) as typeof fetch;
			const result = await stream(
				new AIManager(fakeEditor()),
				new AbortController().signal,
			);
			expect(result.kind).toBe("error");
			expect(result.retryable).toBe(true);
		}
	});
});

describe("streamPuterResponse tool-call accumulation", () => {
	test("parallel tool calls are merged and de-duplicated by id", async () => {
		interface PuterInternals {
			streamPuterResponse(
				messages: unknown[],
				model: string,
				tools: unknown[],
				signal: AbortSignal,
			): Promise<StreamResult>;
		}
		const manager = new AIManager(fakeEditor());
		const result = await (
			manager as unknown as PuterInternals
		).streamPuterResponse([], "test-model", [], new AbortController().signal);

		expect(result.kind).toBe("ok");
		const calls = result.toolCalls as Array<{
			id: string;
			name: string;
			arguments: Record<string, unknown>;
		}>;
		expect(calls).toHaveLength(2);
		expect(calls.map((c) => c.id)).toEqual(["a", "b"]);
		expect(calls[0]?.arguments).toEqual({ step: 2 });
	});
});

describe("streamLLMResponse SSE parsing", () => {
	test("handles CRLF framing and multi-line data fields", async () => {
		globalThis.fetch = (async () =>
			sseResponse([
				'data: {"delta":\r\ndata: "hel"}\r\n\r\n',
				'data: {"delta":"lo"}\r\n\r\n',
				'data: {"done":true}\r\n\r\n',
			])) as typeof fetch;

		const result = await stream(
			new AIManager(fakeEditor()),
			new AbortController().signal,
		);
		expect(result.kind).toBe("ok");
		const assistant = useAIStore
			.getState()
			.messages.find((m) => m.id === result.assistantId);
		expect(assistant?.content).toBe("hello");
	});

	test("a stream that closes without done is an error and drops the partial bubble", async () => {
		globalThis.fetch = (async () =>
			sseResponse(['data: {"delta":"partial"}\n\n'])) as typeof fetch;

		const result = await stream(
			new AIManager(fakeEditor()),
			new AbortController().signal,
		);
		expect(result.kind).toBe("error");
		expect(result.retryable).toBe(true);
		expect(result.message).toContain("ended before completion");
		// The partial assistant bubble was removed so a retry cannot stack a
		// duplicate/empty response.
		expect(useAIStore.getState().messages).toHaveLength(0);
	});

	test("an error event drops the partial bubble and is retryable", async () => {
		globalThis.fetch = (async () =>
			sseResponse([
				'data: {"delta":"half"}\n\n',
				'data: {"error":"upstream exploded","done":true}\n\n',
			])) as typeof fetch;

		const result = await stream(
			new AIManager(fakeEditor()),
			new AbortController().signal,
		);
		expect(result.kind).toBe("error");
		expect(result.retryable).toBe(true);
		expect(useAIStore.getState().messages).toHaveLength(0);
	});

	test("an aborted request is not retryable", async () => {
		const controller = new AbortController();
		controller.abort();
		globalThis.fetch = (async () => {
			throw new DOMException("aborted", "AbortError");
		}) as typeof fetch;

		const result = await stream(new AIManager(fakeEditor()), controller.signal);
		expect(result.kind).toBe("error");
		expect(result.retryable).toBe(false);
	});
});

describe("revertToMessage", () => {
	test("does not spin forever in a read-only session", () => {
		let undoCount = 0;
		const manager = new AIManager(
			fakeEditor({
				command: {
					readOnly: true,
					getHistoryLength: () => 5,
					canUndo: () => true,
					undo: () => {
						undoCount++;
					},
				},
			}),
		);
		useAIStore.setState({
			messages: [
				{ id: "m1", role: "user", content: "hello", timestamp: Date.now() },
			],
			revertSnapshots: { m1: 1 },
		});

		expect(manager.revertToMessage("m1")).toBe(false);
		expect(undoCount).toBe(0);
	});

	test("stops when undo makes no progress", () => {
		let undoCount = 0;
		const manager = new AIManager(
			fakeEditor({
				command: {
					readOnly: false,
					getHistoryLength: () => 5,
					canUndo: () => true,
					undo: () => {
						undoCount++;
					},
				},
			}),
		);
		useAIStore.setState({
			messages: [
				{ id: "m1", role: "user", content: "hello", timestamp: Date.now() },
			],
			revertSnapshots: { m1: 1 },
		});

		// Without the progress guard this loop never terminates.
		expect(manager.revertToMessage("m1")).toBe(true);
		expect(undoCount).toBe(1);
	});
});
