/**
 * In-tab automation bridge — lets same-origin scripts, other tabs, or a
 * local relay drive the live editor through the Editor API (`editor.api`)
 * without going through React.
 *
 * Transport:
 *  - BroadcastChannel("artidor-bridge"): cross-tab, same-origin by nature.
 *  - window.postMessage: same-origin ONLY (cross-origin is ignored).
 *
 * Protocol: requests are `{ id, type: "run" | "list", name?, arguments? }`.
 * Replies carry the same `id` and an `ok` flag (and never a `type`, so a
 * reply is never mistaken for a request — no echo loops). This is the
 * transport the Scripting tab and the MCP relay are built on top of.
 */

import type { EditorCore } from "@/core";

const CHANNEL_NAME = "artidor-bridge";

interface BridgeRequest {
	id?: string | number;
	type: "run" | "list";
	name?: string;
	arguments?: Record<string, unknown>;
}

function isBridgeRequest(data: unknown): data is BridgeRequest {
	if (typeof data !== "object" || data === null) return false;
	const type = (data as { type?: unknown }).type;
	return type === "run" || type === "list";
}

export function startEditorBridge(editor: EditorCore): () => void {
	if (typeof window === "undefined") return () => {};

	const channel =
		"BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;

	const handle = async (
		req: BridgeRequest,
		reply: (msg: Record<string, unknown>) => void,
	) => {
		try {
			if (req.type === "list") {
				reply({ id: req.id, ok: true, commands: editor.api.listCommands() });
				return;
			}
			const result = await editor.api.run(
				req.name ?? "",
				req.arguments ?? {},
				"user",
			);
			reply({ id: req.id, ok: result.ok, result });
		} catch (err) {
			reply({
				id: req.id,
				ok: false,
				result: {
					ok: false,
					message: err instanceof Error ? err.message : "Bridge error",
				},
			});
		}
	};

	const onChannelMessage = (event: MessageEvent) => {
		if (!isBridgeRequest(event.data)) return;
		void handle(event.data, (msg) => channel?.postMessage(msg));
	};

	const onWindowMessage = (event: MessageEvent) => {
		// Same-origin only — never accept commands from a cross-origin frame.
		if (event.origin && event.origin !== window.location.origin) return;
		if (!isBridgeRequest(event.data)) return;
		const source = event.source as WindowProxy | null;
		void handle(event.data, (msg) =>
			source?.postMessage(msg, window.location.origin),
		);
	};

	channel?.addEventListener("message", onChannelMessage);
	window.addEventListener("message", onWindowMessage);

	return () => {
		channel?.removeEventListener("message", onChannelMessage);
		channel?.close();
		window.removeEventListener("message", onWindowMessage);
	};
}
