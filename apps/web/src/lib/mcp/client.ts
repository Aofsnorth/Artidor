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
 *   3. SSE events carry JSON-RPC responses and notifications.
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
	timer: ReturnType<typeof setTimeout>;
};

/**
 * Resolve the POST endpoint advertised by an MCP server, refusing any
 * endpoint that leaves the SSE server's origin.
 *
 * The endpoint event is server-controlled. Without this check a malicious
 * (or compromised) MCP server could point the client at another host and
 * receive the user's bearer token on the next `fetch`.
 */
export function resolvePostEndpoint(raw: string, sseUrl: string): string {
	let base: URL;
	try {
		base = new URL(sseUrl);
	} catch {
		throw new Error("Invalid MCP server URL");
	}
	if (base.protocol !== "http:" && base.protocol !== "https:") {
		throw new Error("MCP server URL must use http or https");
	}

	let resolved: URL;
	try {
		resolved = new URL(raw, base);
	} catch {
		throw new Error("MCP server returned an invalid POST endpoint");
	}
	if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
		throw new Error("MCP POST endpoint must use http or https");
	}
	if (resolved.origin !== base.origin) {
		throw new Error(
			"MCP server returned a POST endpoint on a different origin; refusing to send credentials.",
		);
	}
	return resolved.toString();
}

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
	/** Set once the stream is closed intentionally or has failed fatally. */
	private stopped = false;

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
		this.stopped = false;
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
			this.stopped = true;
			this.closeEventSource();
			this.postEndpoint = null;
			this.failPending("Connection failed");
			this.status = "error";
			this.error = err instanceof Error ? err.message : "Connection failed";
			this.notify();
		}
	}

	private openSse(): Promise<void> {
		return new Promise((resolve, reject) => {
			const url = this.config.url;
			let timeout: ReturnType<typeof setTimeout> | null = null;
			let settled = false;

			const fail = (error: Error) => {
				if (settled) return;
				settled = true;
				if (timeout) clearTimeout(timeout);
				this.closeEventSource();
				reject(error);
			};

			try {
				this.eventSource = new EventSource(url, {
					withCredentials: true,
				});
			} catch (err) {
				fail(err instanceof Error ? err : new Error("SSE connection failed"));
				return;
			}

			timeout = setTimeout(() => {
				fail(new Error("SSE connection timeout"));
			}, 10_000);

			this.eventSource.addEventListener("endpoint", (evt) => {
				if (settled) return;
				if (this.stopped) {
					fail(new Error("Disconnected"));
					return;
				}
				// The endpoint event gives us the POST URL for sending messages.
				// It may be relative — resolve against the SSE URL. The origin is
				// pinned so the bearer token can never be sent to another host.
				const raw = (evt as MessageEvent).data as string;
				try {
					this.postEndpoint = resolvePostEndpoint(raw, url);
				} catch (err) {
					fail(err instanceof Error ? err : new Error("Invalid POST endpoint"));
					return;
				}
				settled = true;
				if (timeout) clearTimeout(timeout);
				resolve();
			});

			this.eventSource.addEventListener("message", (evt) => {
				this.handleMessage((evt as MessageEvent).data as string);
			});

			this.eventSource.onerror = () => {
				if (!settled) {
					fail(new Error("SSE connection failed"));
					return;
				}
				// After a successful handshake, close the stream so the browser
				// does not retry forever against a dead server. Pending calls are
				// failed immediately instead of waiting for their 30s timeouts.
				this.stopped = true;
				this.closeEventSource();
				this.failPending("SSE connection lost");
				this.status = "error";
				this.error = "SSE connection lost";
				this.notify();
			};
		});
	}

	private closeEventSource(): void {
		const source = this.eventSource;
		if (!source) return;
		source.onerror = null;
		this.eventSource = null;
		try {
			source.close();
		} catch {
			// Already closed — nothing to do.
		}
	}

	/** Resolve or reject one pending request exactly once and clear its timer. */
	private settle(id: number, error?: Error, value?: unknown): void {
		const request = this.pending.get(id);
		if (!request) return;
		this.pending.delete(id);
		clearTimeout(request.timer);
		if (error) {
			request.reject(error);
		} else {
			request.resolve(value);
		}
	}

	private failPending(message: string): void {
		for (const [id, request] of this.pending) {
			this.pending.delete(id);
			clearTimeout(request.timer);
			request.reject(new Error(message));
		}
	}

	private handleNotification(method: string): void {
		// The MCP spec's only client-relevant notification for us: the server's
		// tool catalog changed. Refresh it so the AI sees the new tools.
		if (
			method === "notifications/tools/list_changed" &&
			this.status === "connected" &&
			!this.stopped
		) {
			void this.listTools()
				.then(() => this.notify())
				.catch((err) => {
					this.error =
						err instanceof Error ? err.message : "Failed to refresh tools";
					this.notify();
				});
		}
	}

	private handleMessage(raw: string): void {
		try {
			const msg = JSON.parse(raw) as {
				id?: number;
				method?: string;
				result?: unknown;
				error?: { message?: string };
			};
			if (typeof msg.id === "number") {
				if (msg.error) {
					this.settle(
						msg.id,
						new Error(msg.error.message ?? "MCP request failed"),
					);
				} else {
					this.settle(msg.id, undefined, msg.result);
				}
				return;
			}
			// JSON-RPC notifications have no id (or a null id) and must not be
			// treated as responses.
			if (typeof msg.method === "string") {
				this.handleNotification(msg.method);
			}
		} catch {
			// Ignore malformed messages.
		}
	}

	private async sendRequest(method: string, params: unknown): Promise<unknown> {
		if (this.stopped) {
			throw new Error("Disconnected");
		}
		if (!this.postEndpoint) {
			throw new Error("Not connected — no POST endpoint");
		}
		const endpoint = resolvePostEndpoint(this.postEndpoint, this.config.url);
		const id = this.nextId++;
		const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`Request timeout: ${method}`));
			}, 30_000);

			this.pending.set(id, { resolve, reject, timer });

			void fetch(endpoint, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					...(this.config.token
						? { authorization: `Bearer ${this.config.token}` }
						: {}),
				},
				body,
			})
				.then(async (response) => {
					if (response.ok) return;
					let detail = "";
					try {
						const text = (await response.text()).trim();
						if (text) detail = `: ${text.slice(0, 300)}`;
					} catch {
						// Body could not be read; the status alone is still useful.
					}
					this.settle(
						id,
						new Error(`MCP server returned HTTP ${response.status}${detail}`),
					);
				})
				.catch((err) => {
					this.settle(
						id,
						err instanceof Error ? err : new Error("Request failed"),
					);
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
		this.stopped = true;
		this.closeEventSource();
		this.postEndpoint = null;
		this.status = "disconnected";
		this.failPending("Disconnected");
		this.cleanup?.();
		this.notify();
	}
}
