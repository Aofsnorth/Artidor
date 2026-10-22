/**
 * SSE lifecycle regressions: cross-origin POST endpoints, non-2xx HTTP
 * responses, and `notifications/tools/list_changed`.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { McpClientConnection, type McpServerConfig } from "./client";

type Listener = (event: { data: string }) => void;

class FakeEventSource {
	static instances: FakeEventSource[] = [];
	onerror: (() => void) | null = null;
	closed = false;
	private listeners = new Map<string, Set<Listener>>();

	constructor(
		public url: string,
		_init?: unknown,
	) {
		FakeEventSource.instances.push(this);
	}

	addEventListener(type: string, listener: Listener): void {
		const set = this.listeners.get(type) ?? new Set<Listener>();
		set.add(listener);
		this.listeners.set(type, set);
	}

	close(): void {
		this.closed = true;
	}

	emit(type: string, data: string): void {
		for (const listener of this.listeners.get(type) ?? []) {
			listener({ data });
		}
	}
}

const originalFetch = globalThis.fetch;
const originalEventSource = (globalThis as { EventSource?: unknown })
	.EventSource;

const config: McpServerConfig = {
	id: "test",
	name: "Test MCP",
	url: "http://localhost:3000/sse",
	token: "secret",
	enabled: true,
};

beforeEach(() => {
	FakeEventSource.instances = [];
	(globalThis as { EventSource?: unknown }).EventSource = FakeEventSource;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	if (originalEventSource === undefined) {
		delete (globalThis as { EventSource?: unknown }).EventSource;
	} else {
		(globalThis as { EventSource?: unknown }).EventSource = originalEventSource;
	}
});

describe("McpClientConnection SSE lifecycle", () => {
	test("refuses a cross-origin POST endpoint and closes the stream", async () => {
		const connection = new McpClientConnection(config, () => {});
		const connecting = connection.connect();
		const source = FakeEventSource.instances[0];

		source?.emit("endpoint", "https://evil.example/collect");
		await connecting;

		expect(connection.getConnection().status).toBe("error");
		expect(connection.getConnection().error).toContain("different origin");
		expect(source?.closed).toBe(true);
	});

	test("surfaces a non-2xx HTTP response instead of a timeout", async () => {
		globalThis.fetch = mock(async () => {
			return new Response("upstream exploded", { status: 502 });
		}) as unknown as typeof fetch;

		const connection = new McpClientConnection(config, () => {});
		const connecting = connection.connect();
		FakeEventSource.instances[0]?.emit("endpoint", "/messages");
		await connecting;

		expect(connection.getConnection().status).toBe("error");
		expect(connection.getConnection().error).toContain("HTTP 502");
		expect(connection.getConnection().error).toContain("upstream exploded");
	});

	test("refreshes tools on notifications/tools/list_changed", async () => {
		let listCalls = 0;
		let source: FakeEventSource | undefined;

		globalThis.fetch = mock(async (_url: string, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body)) as {
				id?: number;
				method?: string;
			};
			if (typeof body.id === "number") {
				const result =
					body.method === "tools/list"
						? {
								tools: [
									{
										name: listCalls++ === 0 ? "first-tool" : "second-tool",
										description: "test",
										inputSchema: {},
									},
								],
							}
						: {};
				setTimeout(() => {
					source?.emit(
						"message",
						JSON.stringify({ jsonrpc: "2.0", id: body.id, result }),
					);
				}, 0);
			}
			return new Response("{}", { status: 200 });
		}) as unknown as typeof fetch;

		const connection = new McpClientConnection(config, () => {});
		const connecting = connection.connect();
		source = FakeEventSource.instances[0];
		source?.emit("endpoint", "/messages");
		await connecting;

		expect(connection.getConnection().status).toBe("connected");
		expect(connection.getTools().map((tool) => tool.name)).toEqual([
			"first-tool",
		]);

		source?.emit(
			"message",
			JSON.stringify({
				jsonrpc: "2.0",
				method: "notifications/tools/list_changed",
			}),
		);
		await Bun.sleep(20);

		expect(connection.getTools().map((tool) => tool.name)).toEqual([
			"second-tool",
		]);
		expect(listCalls).toBe(2);
	});
});
