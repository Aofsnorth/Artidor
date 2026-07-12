/**
 * MCP (Model Context Protocol) client runtime.
 *
 * Connects to external MCP servers over SSE (Server-Sent Events) and
 * exposes their tools to the Artidor AI assistant. This lets Arth use
 * tools from any MCP-compatible server — filesystem, web search,
 * databases, custom integrations — alongside the built-in editor tools.
 *
 * Protocol: JSON-RPC 2.0 over SSE.
 *   1. GET /sse → opens SSE stream, receives `endpoint` event with
 *      the POST URL for sending messages.
 *   2. POST to endpoint → send JSON-RPC requests (initialize, tools/list,
 *      tools/call).
 *   3. SSE events carry JSON-RPC responses.
 *
 * This is a minimal client — no SDK dependency. The MCP spec is simple
 * enough that we can speak it directly.
 */

export interface McpTool {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export interface McpServerConfig {
	id: string;
	name: string;
	url: string;
	/** Optional bearer token for authenticated MCP servers. */
	token?: string;
	enabled: boolean;
}

export interface McpConnection {
	config: McpServerConfig;
	status: "connecting" | "connected" | "error" | "disconnected";
	tools: McpTool[];
	error?: string;
}

type PendingRequest = {
	resolve: (value: unknown) => void;
	reject: (err: Error) => void;
};

/**
 * Manages a single SSE connection to an MCP server.
 * Handles the JSON-RPC handshake, tool listing, and tool calls.
 */
export class McpClientConnection {
	private eventSource: EventSource | null = null;
	private postEndpoint: string | null = null;
	private nextId = 1;
	private pending = new Map<number, PendingRequest>();
	private tools: McpTool[] = [];
	private status: McpConnection["status"] = "connecting";
	private error: string | undefined;
	private cleanup: (() => void) | null = null;

	constructor(
		private config: McpServerConfig,
		private onUpdate: (conn: McpConnection) => void,
	) {}

	getConnection(): McpConnection {
		return {
			config: this.config,
			status: this.status,
			tools: this.tools,
			error: this.error,
		};
	}

	private notify() {
		this.onUpdate(this.getConnection());
	}

	async connect(): Promise<void> {
		this.status = "connecting";
		this.error = undefined;
		this.notify();

		try {
			await this.openSse();
			await this.initialize();
			await this.listTools();
			this.status = "connected";
			this.notify();
		} catch (err) {
			this.status = "error";
			this.error = err instanceof Error ? err.message : "Connection failed";
			this.notify();
		}
	}

	private openSse(): Promise<void> {
		return new Promise((resolve, reject) => {
			const url = this.config.url;
			try {
				this.eventSource = new EventSource(url, {
					withCredentials: true,
				});
			} catch (err) {
				reject(err);
				return;
			}

			const timeout = setTimeout(() => {
				reject(new Error("SSE connection timeout"));
			}, 10_000);

			this.eventSource.addEventListener("endpoint", (evt) => {
				clearTimeout(timeout);
				// The endpoint event gives us the POST URL for sending messages.
				// It may be relative — resolve against the SSE URL.
				const raw = (evt as MessageEvent).data as string;
				try {
					this.postEndpoint = new URL(raw, url).toString();
				} catch {
					this.postEndpoint = raw;
				}
				resolve();
			});

			this.eventSource.addEventListener("message", (evt) => {
				this.handleMessage((evt as MessageEvent).data as string);
			});

			this.eventSource.onerror = () => {
				clearTimeout(timeout);
				if (this.status === "connecting") {
					reject(new Error("SSE connection failed"));
				}
			};
		});
	}

	private handleMessage(raw: string): void {
		try {
			const msg = JSON.parse(raw) as {
				id?: number;
				result?: unknown;
				error?: { message: string };
			};
			if (msg.id !== undefined) {
				const pending = this.pending.get(msg.id);
				if (pending) {
					this.pending.delete(msg.id);
					if (msg.error) {
						pending.reject(new Error(msg.error.message));
					} else {
						pending.resolve(msg.result);
					}
				}
			}
		} catch {
			// Ignore malformed messages.
		}
	}

	private async sendRequest(method: string, params: unknown): Promise<unknown> {
		if (!this.postEndpoint) {
			throw new Error("Not connected — no POST endpoint");
		}
		const id = this.nextId++;
		const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`Request timeout: ${method}`));
			}, 30_000);

			this.pending.set(id, { resolve, reject });

			const endpoint = this.postEndpoint;
			if (!endpoint) {
				reject(new Error("Not connected — no POST endpoint"));
				return;
			}
			fetch(endpoint, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					...(this.config.token
						? { authorization: `Bearer ${this.config.token}` }
						: {}),
				},
				body,
			}).catch((err) => {
				clearTimeout(timeout);
				this.pending.delete(id);
				reject(err instanceof Error ? err : new Error("Request failed"));
			});
		});
	}

	private async initialize(): Promise<void> {
		await this.sendRequest("initialize", {
			protocolVersion: "2024-11-05",
			capabilities: {},
			clientInfo: { name: "artidor", version: "1.0.0" },
		});
		// Send initialized notification (no response expected).
		if (this.postEndpoint) {
			void fetch(this.postEndpoint, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					...(this.config.token
						? { authorization: `Bearer ${this.config.token}` }
						: {}),
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "notifications/initialized",
				}),
			}).catch(() => {});
		}
	}

	private async listTools(): Promise<void> {
		const result = (await this.sendRequest("tools/list", {})) as {
			tools?: McpTool[];
		};
		this.tools = result.tools ?? [];
	}

	getTools(): McpTool[] {
		return this.tools;
	}

	async callTool(
		name: string,
		args: Record<string, unknown>,
	): Promise<unknown> {
		const result = await this.sendRequest("tools/call", {
			name,
			arguments: args,
		});
		return result;
	}

	disconnect(): void {
		this.eventSource?.close();
		this.eventSource = null;
		this.postEndpoint = null;
		this.status = "disconnected";
		for (const p of this.pending.values()) {
			p.reject(new Error("Disconnected"));
		}
		this.pending.clear();
		this.cleanup?.();
		this.notify();
	}
}
