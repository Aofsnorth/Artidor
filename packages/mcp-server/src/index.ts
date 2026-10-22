#!/usr/bin/env node
/**
 * Artidor MCP server.
 *
 * Exposes the Artidor editor's command vocabulary to MCP clients (Cursor,
 * Claude Desktop, ...) over stdio. Because the editor is local-first — its
 * state lives in a browser tab — this process can't run commands itself; it
 * RELAYS them into a running editor tab over a localhost WebSocket.
 *
 *   MCP client ──stdio──▶ this server ──ws://127.0.0.1──▶ editor tab (bridge)
 *
 * The tool catalog is fetched LIVE from the connected tab (no schema
 * duplication): `tools/list` asks the tab, `tools/call` relays the call and
 * returns the editor's ToolExecutionResult. With no tab connected, tools/list
 * is empty and calls return a clear "editor not connected" error.
 *
 * IMPORTANT: stdout is the MCP transport — all logging goes to stderr.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocket, WebSocketServer } from "ws";
import {
	configuredAppOrigins,
	isAllowedOrigin,
	parseRelayPort,
} from "./relay-policy.js";

const CALL_TIMEOUT_MS = 30_000;

const log = (...args: unknown[]): void => {
	// Never write to stdout — it carries the MCP protocol.
	console.error("[artidor-mcp]", ...args);
};

interface CommandInfo {
	name: string;
	description: string;
	category: string;
	parameters: Record<string, unknown>;
}

interface ToolResult {
	ok: boolean;
	message?: string;
	data?: unknown;
}

interface RelayReply {
	id: number;
	ok?: boolean;
	commands?: CommandInfo[];
	result?: ToolResult;
}

interface Pending {
	resolve: (value: RelayReply) => void;
	reject: (err: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

const server = new Server(
	{ name: "artidor", version: "0.1.0" },
	{ capabilities: { tools: { listChanged: true } } },
);

/* ----------------------------- localhost relay ---------------------------- */

let editor: WebSocket | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

/** Fail every in-flight MCP request so callers don't wait for the timeout. */
function failPending(message: string): void {
	for (const [id, request] of pending) {
		clearTimeout(request.timer);
		pending.delete(id);
		request.reject(new Error(message));
	}
}

let port: number;
try {
	port = parseRelayPort(process.env.ARTIDOR_MCP_PORT);
} catch (err) {
	log("fatal:", err instanceof Error ? err.message : err);
	process.exit(1);
	throw err;
}
const appOrigins = configuredAppOrigins();

let wss: WebSocketServer;
try {
	wss = new WebSocketServer({
		host: "127.0.0.1",
		port,
		verifyClient: ({ origin }, done) => {
			if (isAllowedOrigin({ origin, appOrigins })) {
				done(true);
				return;
			}
			log(
				`rejected WebSocket connection from disallowed origin: ${origin ?? "<missing>"}`,
			);
			// 403 during the HTTP upgrade — the browser never gets a socket.
			done(false, 403, "Forbidden");
		},
	});
} catch (err) {
	log("fatal: could not start the relay WebSocket server:", err);
	process.exit(1);
	throw err;
}

wss.on("listening", () => {
	log(`relay listening on ws://127.0.0.1:${port}`);
	if (appOrigins.length > 0) {
		log(`allowed app origins: ${appOrigins.join(", ")}`);
	}
});

wss.on("error", (err: Error) => {
	if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
		log(
			`fatal: port ${port} is already in use. Stop the other Artidor MCP relay or set ARTIDOR_MCP_PORT to a free port.`,
		);
	} else {
		log("fatal: relay server error:", err);
	}
	process.exit(1);
});

wss.on("connection", (socket: WebSocket) => {
	// Only one editor tab may own the relay. Reject the newcomer instead of
	// silently overwriting the existing connection, which used to leave its
	// pending requests hanging and rebind replies to the wrong tab.
	if (editor) {
		if (editor.readyState === WebSocket.OPEN) {
			log(
				"rejected additional editor connection — one tab is already connected",
			);
			socket.close(4009, "Another Artidor editor tab is already connected");
			return;
		}
		log("replacing stale editor connection");
		failPending("The editor connection was replaced by a newer tab.");
		editor = null;
	}

	log("editor tab connected");
	editor = socket;

	socket.on("message", (data) => {
		// Replies are bound to the socket that owns the relay. A stale socket
		// closing after a replacement must not resolve another tab's requests.
		if (editor !== socket) {
			log("ignoring message from stale editor socket");
			return;
		}
		try {
			const reply = JSON.parse(data.toString()) as RelayReply;
			if (typeof reply.id !== "number") return;
			const request = pending.get(reply.id);
			if (request) {
				pending.delete(reply.id);
				clearTimeout(request.timer);
				request.resolve(reply);
			}
		} catch (err) {
			log("ignoring malformed message from editor:", err);
		}
	});

	socket.on("error", (err) => {
		log("editor socket error:", err.message);
	});

	socket.on("close", () => {
		if (editor === socket) {
			editor = null;
			failPending("The editor tab disconnected before replying.");
		}
		log("editor tab disconnected");
	});

	// A tab just connected — its catalog is now available; tell MCP clients.
	void server.sendToolListChanged().catch(() => {});
});

function relay(
	type: "list" | "run",
	payload: Record<string, unknown> = {},
): Promise<RelayReply> {
	const socket = editor;
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		return Promise.reject(
			new Error(
				"No Artidor editor tab is connected to the relay. Open the editor " +
					"(with NEXT_PUBLIC_MCP_RELAY_URL pointing at this relay) and retry.",
			),
		);
	}
	const id = nextId++;
	return new Promise<RelayReply>((resolve, reject) => {
		const timer = setTimeout(() => {
			pending.delete(id);
			reject(new Error("The editor tab did not respond in time."));
		}, CALL_TIMEOUT_MS);
		pending.set(id, { resolve, reject, timer });
		socket.send(JSON.stringify({ id, type, ...payload }));
	});
}

/* ------------------------------- MCP handlers ----------------------------- */

server.setRequestHandler(ListToolsRequestSchema, async () => {
	try {
		const reply = await relay("list");
		return {
			tools: (reply.commands ?? []).map((cmd) => ({
				name: cmd.name,
				description: cmd.description,
				inputSchema: cmd.parameters,
			})),
		};
	} catch (err) {
		log("tools/list failed:", err instanceof Error ? err.message : err);
		return { tools: [] };
	}
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;
	try {
		const reply = await relay("run", { name, arguments: args ?? {} });
		const result = reply.result ?? { ok: reply.ok ?? false };
		return {
			content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			isError: !result.ok,
		};
	} catch (err) {
		return {
			content: [
				{
					type: "text",
					text: err instanceof Error ? err.message : String(err),
				},
			],
			isError: true,
		};
	}
});

/* ---------------------------------- main ---------------------------------- */

async function main(): Promise<void> {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	log("ready (stdio). Open the Artidor editor tab to connect it to the relay.");
}

main().catch((err) => {
	log("fatal:", err);
	process.exit(1);
});
