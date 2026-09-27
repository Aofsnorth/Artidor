/**
 * AI chat store perf regressions: persistence coalescing during streaming and
 * bulk-media stripping on persist.
 *
 * Every SSE delta calls `updateMessage` → `set` → persist, so a single answer
 * used to re-serialize and write the whole conversation to storage per token.
 * A storage spy counts real writes; the assertions pin both the write count
 * and the durability guarantee (the settled value is always written).
 */
import { afterAll, describe, expect, test, mock } from "bun:test";
import { createJSONStorage } from "zustand/middleware";

const PERSIST_KEY = "artidor-ai-chat";
const memory = new Map<string, string>();
const writes: string[] = [];

mock.module("@/stores/browser-storage", () => ({
	browserStorage: createJSONStorage<Record<string, unknown>>(() => ({
		getItem: (key: string) => memory.get(key) ?? null,
		setItem: (key: string, value: string) => {
			writes.push(value);
			memory.set(key, value);
		},
		removeItem: (key: string) => {
			memory.delete(key);
		},
	})),
}));

/* A minimal `window` so the store registers its pagehide flush. */
const pagehideListeners: Array<() => void> = [];
Object.defineProperty(globalThis, "window", {
	configurable: true,
	value: {
		addEventListener: (type: string, listener: () => void) => {
			if (type === "pagehide") pagehideListeners.push(listener);
		},
	},
});

const { useAIStore } = await import("../ai-store");

afterAll(() => {
	Reflect.deleteProperty(globalThis, "window");
});

/** The shared throttle flushes on a trailing edge; wait past its window. */
const TRAILING_FLUSH_MS = 300;
const settleWrites = () =>
	new Promise((resolve) => setTimeout(resolve, TRAILING_FLUSH_MS));

function persistedState(): {
	messages: Array<{
		content: string;
		toolCalls?: Array<{ result?: { data?: unknown } | undefined }>;
	}>;
} {
	const raw = memory.get(PERSIST_KEY);
	if (!raw) throw new Error("nothing persisted");
	return JSON.parse(raw).state;
}

function startStream(): string {
	const id = useAIStore.getState().appendMessage({
		role: "assistant",
		content: "",
	});
	useAIStore.getState().setStatus("streaming");
	return id;
}

describe("ai store: persist coalescing while streaming", () => {
	test("a 60-delta response writes storage a handful of times, not 60", async () => {
		writes.length = 0;
		memory.clear();
		const id = startStream();
		await settleWrites();

		const before = writes.length;
		for (let delta = 0; delta < 60; delta++) {
			useAIStore.getState().updateMessage(id, { content: `tok${delta}` });
		}
		// 60 deltas must not produce 60 serializations + writes: they collapse
		// into the coalescing window, and the settle below writes once.
		expect(writes.length - before).toBe(0);

		// The response settles: the latest value is written before the test
		// ends, so a reload right after the answer never loses it.
		useAIStore.getState().updateMessage(id, { content: "final answer" });
		useAIStore.getState().setStatus("idle");
		await settleWrites();
		expect(writes.length - before).toBe(1);
		const state = persistedState();
		const message = state.messages.find((m) => m.content !== "");
		expect(message?.content).toBe("final answer");
	});

	test("a reload mid-stream still persists the latest conversation", async () => {
		writes.length = 0;
		memory.clear();
		const id = startStream();
		await settleWrites();
		useAIStore.getState().updateMessage(id, { content: "half an ans" });
		await settleWrites();
		// Still inside the coalescing window: the partial answer is not
		// durable yet (only the state from before the stream started is).
		expect(
			persistedState().messages.some((m) => m.content === "half an ans"),
		).toBe(false);

		// A reload/close fires pagehide, which writes synchronously and
		// unthrottled, so the answer so far survives the reload.
		for (const flushOnHide of pagehideListeners) flushOnHide();
		expect(
			persistedState().messages.some((m) => m.content === "half an ans"),
		).toBe(true);
		useAIStore.getState().setStatus("idle");
	});

	test("non-streaming writes are not deferred", async () => {
		writes.length = 0;
		memory.clear();
		useAIStore.getState().setStatus("idle");
		await settleWrites();
		writes.length = 0;

		useAIStore.getState().setAdvancedSettings({ maxToolRounds: 42 });
		await settleWrites();

		expect(writes.length).toBeGreaterThanOrEqual(1);
		expect(
			JSON.parse(writes[writes.length - 1] as string).state.advancedSettings
				.maxToolRounds,
		).toBe(42);
	});
});

describe("ai store: bulk media is never persisted", () => {
	test("tool result data URLs are stripped from storage but kept in memory", async () => {
		writes.length = 0;
		memory.clear();
		useAIStore.getState().setStatus("idle");
		await settleWrites();
		const huge = `data:video/mp4;base64,${"A".repeat(20_000)}`;
		const small = "data:image/png;base64,iVBORw0KGgo=";
		const id = useAIStore.getState().appendMessage({
			role: "assistant",
			content: "here it is",
			toolCalls: [
				{
					name: "view_asset",
					args: { assetId: "a1" },
					result: {
						ok: true,
						message: "ok",
						data: {
							kind: "video-frames",
							videoDataUrl: huge,
							frames: [{ dataUrl: huge, timeSeconds: 0 }],
							smallUrl: small,
						},
					},
				},
			],
		});
		useAIStore.getState().setStatus("idle");
		await settleWrites();

		// The live store keeps the payload: the panel renders the asset from
		// it for the rest of the session.
		const live = useAIStore.getState().messages.find((m) => m.id === id);
		const liveData = live?.toolCalls?.[0]?.result?.data as {
			videoDataUrl: string;
		};
		expect(liveData.videoDataUrl).toBe(huge);
		expect(liveData.videoDataUrl.length).toBe(huge.length);

		// The persisted copy carries markers instead of the payloads.
		const persisted = persistedState().messages.find((m) => m.id === id);
		const data = persisted?.toolCalls?.[0]?.result?.data as {
			videoDataUrl: string;
			frames: Array<{ dataUrl: string }>;
			smallUrl: string;
		};
		expect(data.videoDataUrl).toBe(`[omitted ${huge.length} char data URL]`);
		expect(data.frames[0]?.dataUrl).toBe(`[omitted ${huge.length} char data URL]`);
		// Small data URLs are kept, and the shape is unchanged.
		expect(data.smallUrl).toBe(small);
		expect(data.frames).toHaveLength(1);
	});

	test("messages without tool results are persisted unchanged", async () => {
		writes.length = 0;
		memory.clear();
		const id = useAIStore.getState().appendMessage({
			role: "user",
			content: "hello",
		});
		useAIStore.getState().setStatus("idle");
		await settleWrites();

		const persisted = persistedState().messages.find((m) => m.id === id);
		expect(persisted).toEqual({
			id,
			role: "user",
			content: "hello",
			timestamp: persisted?.timestamp,
		});
	});
});
