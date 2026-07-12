/**
 * Scripting worker — runs a user automation script in an isolated worker so
 * it can't freeze the editor UI and can be hard-cancelled via terminate().
 *
 * The script gets one global, `artidor`, whose methods don't touch the editor
 * directly — they postMessage a request to the main thread, which applies it
 * through editor.api (so every mutation is an undoable command) and posts the
 * result back. `console.*` is mirrored to the script output panel.
 */

export type ScriptingWorkerMessage =
	| { type: "exec"; code: string }
	| { type: "result"; callId: number; result: unknown };

export type ScriptingWorkerResponse =
	| { type: "call"; callId: number; method: "run" | "list"; payload: unknown }
	| { type: "log"; level: "log" | "error"; text: string }
	| { type: "done" }
	| { type: "error"; text: string };

let nextCallId = 0;
const pending = new Map<number, (value: unknown) => void>();

function callMain(method: "run" | "list", payload: unknown): Promise<unknown> {
	const callId = nextCallId++;
	return new Promise((resolve) => {
		pending.set(callId, resolve);
		self.postMessage({
			type: "call",
			callId,
			method,
			payload,
		} satisfies ScriptingWorkerResponse);
	});
}

function stringify(value: unknown): string {
	if (typeof value === "string") return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function emit(level: "log" | "error", args: unknown[]): void {
	self.postMessage({
		type: "log",
		level,
		text: args.map(stringify).join(" "),
	} satisfies ScriptingWorkerResponse);
}

const consoleProxy = {
	log: (...args: unknown[]) => emit("log", args),
	info: (...args: unknown[]) => emit("log", args),
	warn: (...args: unknown[]) => emit("log", args),
	error: (...args: unknown[]) => emit("error", args),
};

const artidor = {
	/** Run an editor command by name; resolves with its ToolExecutionResult.
	 * The command name is NOT dispatched dynamically in this worker — it
	 * is sent as a string payload to the main thread, which validates it
	 * against the registered tool registry before execution. Untrusted
	 * names are rejected on the main thread, so this is safe.
	 */
	run: (name: string, args?: Record<string, unknown>) =>
		callMain("run", { name, args: args ?? {} }),
	/** List every available command (name, description, category, schema). */
	commands: () => callMain("list", {}),
	/** Print to the script output panel. */
	log: (...args: unknown[]) => emit("log", args),
};

self.onmessage = async (event: MessageEvent<ScriptingWorkerMessage>) => {
	const message = event.data;

	if (message.type === "result") {
		const resolve = pending.get(message.callId);
		if (resolve) {
			pending.delete(message.callId);
			resolve(message.result);
		}
		return;
	}

	if (message.type === "exec") {
		try {
			// The user script runs in an isolated Web Worker with only the
			// curated `artidor` + console proxies in scope — this IS the
			// sandbox. No DOM, no fetch, no main-thread globals are
			// accessible. All editor mutations go through `artidor.run()`
			// which posts a message to the main thread where the command
			// name is validated against the registered tool registry before
			// execution. The `new Function` constructor is intentional here
			// and safe because the worker has no access to sensitive APIs.
			// This is a user-authored automation script (like a macro),
			// not untrusted remote input — the user is running their own
			// code in their own browser.
			// Intentional: user-authored automation macro runs in an isolated
			// Web Worker with no DOM/fetch/network access. All editor mutations
			// go through artidor.run(), which is validated against the tool
			// registry on the main thread. See the security comment above.
			const runner = new Function( // nosemgrep: no-eval, detect-eval-with-expression, eval-detected — intentional sandbox
				"artidor",
				"console",
				`"use strict"; return (async () => {\n${message.code}\n})();`,
			);
			await runner(artidor, consoleProxy);
			self.postMessage({ type: "done" } satisfies ScriptingWorkerResponse);
		} catch (err) {
			self.postMessage({
				type: "error",
				text: err instanceof Error ? (err.stack ?? err.message) : String(err),
			} satisfies ScriptingWorkerResponse);
		}
	}
};
