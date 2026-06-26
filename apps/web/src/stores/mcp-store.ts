/**
 * MCP (Model Context Protocol) server store.
 *
 * Manages the user's configured external MCP server connections.
 * Each server exposes tools that the Arth AI assistant can use
 * alongside the built-in editor tools.
 *
 * Persisted to localStorage so server configs survive reloads.
 * Connections are re-established on mount.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	McpClientConnection,
	type McpConnection,
	type McpServerConfig,
	type McpTool,
} from "@/lib/mcp/client";

interface McpState {
	servers: McpServerConfig[];
	/** Live connection state — not persisted. */
	connections: McpConnection[];

	/* mutations */
	addServer: (config: Omit<McpServerConfig, "id">) => void;
	updateServer: (id: string, patch: Partial<McpServerConfig>) => void;
	removeServer: (id: string) => void;
	/** Update live connection state (called by McpClientConnection). */
	updateConnection: (conn: McpConnection) => void;
	/** Get all tools from all connected servers. */
	getAllTools: () => Array<McpTool & { serverId: string; serverName: string }>;
}

export const useMcpStore = create<McpState>()(
	persist(
		(set, get) => ({
			servers: [],
			connections: [],

			addServer: (config) => {
				const server: McpServerConfig = {
					id: crypto.randomUUID(),
					...config,
				};
				set({ servers: [...get().servers, server] });
			},

			updateServer: (id, patch) => {
				set({
					servers: get().servers.map((s) =>
						s.id === id ? { ...s, ...patch } : s,
					),
				});
			},

			removeServer: (id) => {
				set({
					servers: get().servers.filter((s) => s.id !== id),
					connections: get().connections.filter((c) => c.config.id !== id),
				});
			},

			updateConnection: (conn) => {
				const existing = get().connections.find(
					(c) => c.config.id === conn.config.id,
				);
				set({
					connections: existing
						? get().connections.map((c) =>
								c.config.id === conn.config.id ? conn : c,
							)
						: [...get().connections, conn],
				});
			},

			getAllTools: () => {
				return get()
					.connections.filter((c) => c.status === "connected")
					.flatMap((c) =>
						c.tools.map((t) => ({
							...t,
							serverId: c.config.id,
							serverName: c.config.name,
						})),
					);
			},
		}),
		{
			name: "artidor-mcp-servers",
			partialize: (state) => ({ servers: state.servers }),
		},
	),
);

/* --------------------------- Connection manager --------------------------- */

/**
 * Manages the lifecycle of MCP client connections.
 * A single instance is created on mount and keeps connections alive.
 */
export class McpConnectionManager {
	private connections = new Map<string, McpClientConnection>();

	start(): void {
		const { servers, updateConnection } = useMcpStore.getState();
		for (const server of servers) {
			if (server.enabled) {
				this.connect(server, updateConnection);
			}
		}
	}

	connect(
		config: McpServerConfig,
		onUpdate: (conn: McpConnection) => void,
	): void {
		// Disconnect existing connection for this server.
		this.disconnect(config.id);

		const conn = new McpClientConnection(config, onUpdate);
		this.connections.set(config.id, conn);
		void conn.connect();
	}

	disconnect(serverId: string): void {
		const conn = this.connections.get(serverId);
		if (conn) {
			conn.disconnect();
			this.connections.delete(serverId);
		}
	}

	disconnectAll(): void {
		for (const conn of this.connections.values()) {
			conn.disconnect();
		}
		this.connections.clear();
	}

	getConnection(serverId: string): McpClientConnection | undefined {
		return this.connections.get(serverId);
	}

	/** Call a tool on a specific MCP server. */
	async callTool(
		serverId: string,
		toolName: string,
		args: Record<string, unknown>,
	): Promise<unknown> {
		const conn = this.connections.get(serverId);
		if (!conn) {
			throw new Error(`MCP server ${serverId} not connected`);
		}
		return conn.callTool(toolName, args);
	}
}

/** Singleton — one connection manager for the app. */
let _instance: McpConnectionManager | null = null;
export function getMcpConnectionManager(): McpConnectionManager {
	if (!_instance) {
		_instance = new McpConnectionManager();
	}
	return _instance;
}
